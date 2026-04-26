/**
 * `aidd-tracker doctor` — hook 導入状態の診断。
 *
 * 設計: docs/specs/003-npx-installer.md `doctor コマンド` 節
 *
 * チェック段階:
 *   1. 環境（Node version >=18、パッケージ version）
 *   2. パス解決（claudeHome / hooksDir / settingsPath / configPath）
 *   3. hook ファイル（aidd-log-*.js 6 種 + shared/utils.js）
 *   4. settings.json（valid JSON、自社 hook が 6 イベント全てに登録）
 *   5. config.json（valid JSON、api_url / api_key 存在、chmod 600）
 *   6. API 疎通（POST /api/hook/session-start にダミー送信、5 秒タイムアウト）
 *
 * 出力:
 *   - 各行 [OK]/[WARN]/[ERROR] をカラー（kleur）付きで表示
 *   - 末尾に Summary（OK/WARN/ERROR 件数）
 *
 * exit code:
 *   - 0: 全 OK or WARN のみ
 *   - 2: ERROR が 1 件以上
 */
import { promises as fs, readFileSync } from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';
import * as https from 'node:https';
import { fileURLToPath } from 'node:url';
import kleur from 'kleur';

import {
  getClaudeHome,
  getHooksDir,
  getSettingsPath,
  getConfigPath,
  type Scope,
} from '../lib/paths.js';
import type { ClaudeSettings, HookMatcher } from '../lib/settings-merger.js';

/**
 * 6 種の hook イベントとその command 文字列に含まれる識別子。
 * settings.json マージで使うテンプレと同期している。
 */
const REQUIRED_HOOK_EVENTS: { event: string; marker: string }[] = [
  { event: 'SessionStart', marker: 'aidd-log-session-start' },
  { event: 'UserPromptSubmit', marker: 'aidd-log-prompt' },
  { event: 'SubagentStart', marker: 'aidd-log-subagent-start' },
  { event: 'SubagentStop', marker: 'aidd-log-subagent-stop' },
  { event: 'SessionEnd', marker: 'aidd-log-session-end' },
  { event: 'Stop', marker: 'aidd-log-stop' },
];

const REQUIRED_HOOK_FILES = [
  'aidd-log-session-start.js',
  'aidd-log-session-end.js',
  'aidd-log-prompt.js',
  'aidd-log-stop.js',
  'aidd-log-subagent-start.js',
  'aidd-log-subagent-stop.js',
];

const OWN_HOOK_MARKER = 'aidd-log-';

/**
 * `runDoctor` のオプション。CLI flags が直接渡される。
 */
export interface DoctorOptions {
  scope?: Scope;
}

/**
 * 各チェック行の結果レベル。
 */
type CheckLevel = 'OK' | 'WARN' | 'ERROR';

interface CheckLine {
  level: CheckLevel;
  message: string;
}

/**
 * 診断フロー本体。
 *
 * 全段階のチェック結果を集約し、出力後に exit code (0|2) を返す。
 */
export async function runDoctor(opts: DoctorOptions = {}): Promise<number> {
  const lines: CheckLine[] = [];
  const scope: Scope = opts.scope ?? 'user';
  const pathOpts = { scope };

  console.log(kleur.bold('Claude Code Activity Tracker — doctor\n'));

  // 1. 環境
  lines.push(checkNodeVersion());
  lines.push(checkPackageVersion());

  // 2. パス
  const claudeHome = getClaudeHome(pathOpts);
  const hooksDir = getHooksDir(pathOpts);
  const settingsPath = getSettingsPath(pathOpts);
  const configPath = getConfigPath(pathOpts);
  lines.push({ level: 'OK', message: `claude home: ${claudeHome}` });
  lines.push(await checkDirExists(hooksDir, 'hooks dir'));

  // 3. hook ファイル
  const hookFileLines = await checkHookFiles(hooksDir);
  for (const l of hookFileLines) {
    lines.push(l);
  }

  // 4. settings.json
  const settingsLines = await checkSettingsJson(settingsPath, hooksDir);
  for (const l of settingsLines) {
    lines.push(l);
  }

  // 5. config.json
  const configResult = await checkConfigJson(configPath);
  for (const l of configResult.lines) {
    lines.push(l);
  }

  // 6. API 疎通（config が読めた場合のみ）
  if (configResult.apiUrl && configResult.apiKey) {
    lines.push(await checkApiHealth(configResult.apiUrl, configResult.apiKey));
  } else {
    lines.push({
      level: 'WARN',
      message: 'API health: skipped (config.json missing api_url or api_key)',
    });
  }

  // 出力
  for (const line of lines) {
    console.log(formatLine(line));
  }

  // サマリ
  const counts = countLevels(lines);
  console.log('');
  console.log(
    `Summary: ${counts.OK} OK, ${counts.WARN} WARN, ${counts.ERROR} ERROR`,
  );

  return counts.ERROR > 0 ? 2 : 0;
}

/**
 * Node のメジャー version が >=18 か検証する。
 */
function checkNodeVersion(): CheckLine {
  const v = process.versions.node;
  const major = parseInt(v.split('.')[0] ?? '0', 10);
  if (major >= 18) {
    return { level: 'OK', message: `Node v${v}` };
  }
  return {
    level: 'ERROR',
    message: `Node v${v} (>=18 required)`,
  };
}

/**
 * 同梱パッケージ（installer 側 package.json）の version を表示する。
 *
 * package.json の解決ができない（npm パッケージとして展開されていない等）場合は
 * WARN を返す。常に dist/commands/ から見て 2 階層上に package.json がある想定。
 */
function checkPackageVersion(): CheckLine {
  try {
    const here =
      (import.meta as unknown as { dirname?: string }).dirname ??
      path.dirname(fileURLToPath(import.meta.url));
    const pkgPath = path.resolve(here, '..', '..', 'package.json');
    const raw = readFileSync(pkgPath, 'utf8');
    const parsed = JSON.parse(raw) as { version?: string };
    if (typeof parsed.version === 'string') {
      return { level: 'OK', message: `package version: ${parsed.version}` };
    }
    return { level: 'WARN', message: 'package version: unknown' };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { level: 'WARN', message: `package version: unreadable (${msg})` };
  }
}

/**
 * 指定ディレクトリの存在を非同期で確認する。
 */
async function checkDirExists(dir: string, label: string): Promise<CheckLine> {
  try {
    const st = await fs.stat(dir);
    if (st.isDirectory()) {
      return { level: 'OK', message: `${label}: ${dir}` };
    }
    return { level: 'ERROR', message: `${label}: ${dir} is not a directory` };
  } catch {
    return { level: 'ERROR', message: `${label}: ${dir} does not exist` };
  }
}

/**
 * hooks ディレクトリ配下の必須ファイル群を検証する。
 */
async function checkHookFiles(hooksDir: string): Promise<CheckLine[]> {
  const lines: CheckLine[] = [];
  let presentCount = 0;
  const missing: string[] = [];

  for (const name of REQUIRED_HOOK_FILES) {
    const p = path.join(hooksDir, name);
    if (await fileExists(p)) {
      presentCount += 1;
    } else {
      missing.push(name);
    }
  }

  if (missing.length === 0) {
    lines.push({
      level: 'OK',
      message: `${presentCount}/${REQUIRED_HOOK_FILES.length} hook scripts present`,
    });
  } else {
    lines.push({
      level: 'ERROR',
      message: `${presentCount}/${REQUIRED_HOOK_FILES.length} hook scripts present (missing: ${missing.join(', ')})`,
    });
  }

  // shared/utils.js
  const sharedUtils = path.join(hooksDir, 'shared', 'utils.js');
  if (await fileExists(sharedUtils)) {
    lines.push({ level: 'OK', message: 'shared/utils.js present' });
  } else {
    lines.push({
      level: 'ERROR',
      message: `shared/utils.js missing at ${sharedUtils}`,
    });
  }

  return lines;
}

/**
 * settings.json の存在・JSON 妥当性・自社 hook の登録数を検証する。
 */
async function checkSettingsJson(
  settingsPath: string,
  hooksDir: string,
): Promise<CheckLine[]> {
  const lines: CheckLine[] = [];

  let raw: string;
  try {
    raw = await fs.readFile(settingsPath, 'utf8');
  } catch {
    lines.push({
      level: 'ERROR',
      message: `settings.json: not found at ${settingsPath}`,
    });
    return lines;
  }

  let parsed: ClaudeSettings;
  try {
    const json: unknown = JSON.parse(raw);
    if (json === null || typeof json !== 'object' || Array.isArray(json)) {
      throw new Error('not a JSON object');
    }
    parsed = json as ClaudeSettings;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    lines.push({
      level: 'ERROR',
      message: `settings.json: invalid JSON (${msg})`,
    });
    return lines;
  }

  // 各イベントごとに自社 hook の存在を確認
  const hooks = parsed.hooks ?? {};
  let registered = 0;
  const missingEvents: string[] = [];
  for (const { event, marker } of REQUIRED_HOOK_EVENTS) {
    const matchers = hooks[event];
    if (matchers && hasOwnEntryWithMarker(matchers, marker)) {
      registered += 1;
    } else {
      missingEvents.push(event);
    }
  }

  if (registered === REQUIRED_HOOK_EVENTS.length) {
    lines.push({
      level: 'OK',
      message: `settings.json: ${registered}/${REQUIRED_HOOK_EVENTS.length} hook events registered`,
    });
  } else if (registered > 0) {
    lines.push({
      level: 'ERROR',
      message: `settings.json: ${registered}/${REQUIRED_HOOK_EVENTS.length} hook events registered (missing: ${missingEvents.join(', ')})`,
    });
  } else {
    lines.push({
      level: 'ERROR',
      message: `settings.json: no aidd-log- hook entries found (events expected: ${REQUIRED_HOOK_EVENTS.map((e) => e.event).join(', ')})`,
    });
  }

  // hooksDir を参照しない自社 hook があれば WARN
  const danglingEvents: string[] = [];
  for (const { event } of REQUIRED_HOOK_EVENTS) {
    const matchers = hooks[event] ?? [];
    const ownCommands = matchers
      .flatMap((m) => m.hooks ?? [])
      .map((h) => h.command)
      .filter((c) => typeof c === 'string' && c.includes(OWN_HOOK_MARKER));
    if (ownCommands.length > 0 && !ownCommands.some((c) => c.includes(hooksDir))) {
      danglingEvents.push(event);
    }
  }
  if (danglingEvents.length > 0) {
    lines.push({
      level: 'WARN',
      message: `settings.json: hook commands do not reference current hooksDir for events: ${danglingEvents.join(', ')}`,
    });
  }

  return lines;
}

/**
 * matcher 配列内に marker (例: `aidd-log-session-start`) を含む command が存在するか。
 */
function hasOwnEntryWithMarker(matchers: HookMatcher[], marker: string): boolean {
  for (const m of matchers) {
    for (const h of m.hooks ?? []) {
      if (typeof h.command === 'string' && h.command.includes(marker)) {
        return true;
      }
    }
  }
  return false;
}

interface ConfigCheckResult {
  lines: CheckLine[];
  apiUrl?: string;
  apiKey?: string;
}

/**
 * config.json の存在・JSON 妥当性・必須キー有無・パーミッションを検証する。
 */
async function checkConfigJson(configPath: string): Promise<ConfigCheckResult> {
  const lines: CheckLine[] = [];
  let raw: string;
  try {
    raw = await fs.readFile(configPath, 'utf8');
  } catch {
    lines.push({
      level: 'ERROR',
      message: `config.json: not found at ${configPath}`,
    });
    return { lines };
  }

  let parsed: Record<string, unknown>;
  try {
    const json: unknown = JSON.parse(raw);
    if (json === null || typeof json !== 'object' || Array.isArray(json)) {
      throw new Error('not a JSON object');
    }
    parsed = json as Record<string, unknown>;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    lines.push({
      level: 'ERROR',
      message: `config.json: invalid JSON (${msg})`,
    });
    return { lines };
  }

  const apiUrl = typeof parsed.api_url === 'string' ? parsed.api_url.trim() : '';
  const apiKey = typeof parsed.api_key === 'string' ? parsed.api_key.trim() : '';
  const missing: string[] = [];
  if (!apiUrl) missing.push('api_url');
  if (!apiKey) missing.push('api_key');

  if (missing.length === 0) {
    lines.push({
      level: 'OK',
      message: 'config.json: api_url, api_key OK',
    });
  } else {
    lines.push({
      level: 'ERROR',
      message: `config.json: missing or empty keys: ${missing.join(', ')}`,
    });
  }

  // パーミッション（非 Windows のみ）
  if (process.platform !== 'win32') {
    try {
      const st = await fs.stat(configPath);
      const mode = st.mode & 0o777;
      if (mode === 0o600) {
        lines.push({ level: 'OK', message: 'config.json mode is 600' });
      } else {
        lines.push({
          level: 'WARN',
          message: `config.json mode is ${mode.toString(8).padStart(3, '0')} (recommend 600)`,
        });
      }
    } catch {
      // 既に ERROR 済みなのでスキップ
    }
  }

  return {
    lines,
    apiUrl: apiUrl || undefined,
    apiKey: apiKey || undefined,
  };
}

/**
 * API 疎通チェック。`POST /api/hook/session-start` にダミー送信。
 *
 * - 200-299: OK
 * - 401: ERROR（キー誤り）
 * - 5xx: WARN（サーバ障害、設定自体は正しい可能性）
 * - timeout / network error: WARN
 */
async function checkApiHealth(apiUrl: string, apiKey: string): Promise<CheckLine> {
  try {
    const status = await postSessionStart(apiUrl, apiKey);
    if (status >= 200 && status < 300) {
      return {
        level: 'OK',
        message: `API health: ${status} OK from ${apiUrl}`,
      };
    }
    if (status === 401 || status === 403) {
      return {
        level: 'ERROR',
        message: `API health: ${status} (api_key rejected) from ${apiUrl}`,
      };
    }
    if (status >= 500) {
      return {
        level: 'WARN',
        message: `API health: ${status} (server error) from ${apiUrl}`,
      };
    }
    return {
      level: 'WARN',
      message: `API health: HTTP ${status} from ${apiUrl}`,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      level: 'WARN',
      message: `API health: ${msg} (${apiUrl})`,
    };
  }
}

/**
 * 5 秒タイムアウトで POST /api/hook/session-start を投げ、HTTP status を返す。
 * ネットワークエラー時は throw。
 */
function postSessionStart(apiUrl: string, apiKey: string): Promise<number> {
  let url: URL;
  try {
    url = new URL('/api/hook/session-start', apiUrl);
  } catch {
    return Promise.reject(new Error(`invalid api_url: ${apiUrl}`));
  }
  const lib = url.protocol === 'https:' ? https : http;

  const body = JSON.stringify({
    session_uuid: `doctor-healthcheck-${Date.now()}`,
    started_at: new Date().toISOString(),
  });

  return new Promise<number>((resolve, reject) => {
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'X-API-Key': apiKey,
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        res.resume();
        resolve(status);
      },
    );
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error('timeout'));
    });
    req.write(body);
    req.end();
  });
}

/**
 * `[OK]   message` 形式に整形しつつ、レベルに応じてカラー付与。
 */
function formatLine(line: CheckLine): string {
  const tag = formatTag(line.level);
  return `  ${tag}  ${line.message}`;
}

function formatTag(level: CheckLevel): string {
  switch (level) {
    case 'OK':
      return kleur.green('[OK]   ');
    case 'WARN':
      return kleur.yellow('[WARN] ');
    case 'ERROR':
      return kleur.red('[ERROR]');
  }
}

function countLevels(lines: CheckLine[]): Record<CheckLevel, number> {
  const counts: Record<CheckLevel, number> = { OK: 0, WARN: 0, ERROR: 0 };
  for (const line of lines) {
    counts[line.level] += 1;
  }
  return counts;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
