/**
 * `aidd-tracker install` — Claude Code hooks のインストール。
 *
 * 設計: docs/specs/003-npx-installer.md `install コマンド` 節
 *
 * 処理:
 *   1. プロンプト or CLI flags で `--api-url`, `--api-key`, `--email`, `--scope` 取得
 *   2. ターゲットパス（hooksDir / settingsPath / configPath）解決
 *   3. hooksDir / shared 作成
 *   4. installer/hooks/* を hooksDir にコピー（再帰、.js / .gitkeep のみ）
 *   5. settings.json を mergeHookSettings で更新
 *   6. config.json を生成（chmod 600）
 *   7. healthcheck（POST /api/hook/session-start）
 *   8. サマリ出力
 *
 * 失敗時の方針:
 *   - healthcheck 失敗は警告のみ、インストール自体は完了扱い
 *   - settings.json マージ失敗は throw（呼出元に伝播）
 *
 * 実 ~/.claude には触れず、テストでは CLAUDE_HOME env で偽 home を指定可能。
 */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';
import * as https from 'node:https';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';
import kleur from 'kleur';

import {
  getClaudeHome,
  getHooksDir,
  getSettingsPath,
  getConfigPath,
  type Scope,
} from '../lib/paths.js';
import {
  mergeHookSettings,
  type ClaudeSettings,
  type MergeHookSettingsResult,
} from '../lib/settings-merger.js';

/**
 * settings.json テンプレ。`installer/src/templates/settings-hooks.json` と
 * 同等の内容を inline 定数として保持する。
 *
 * ビルド時に `src/templates/` は npm パッケージへ同梱されない（package.json の
 * `files` は `dist/**` と `hooks/**` のみ）ため、ランタイムでファイル参照すると
 * `npx` 実行時に ENOENT になる。inline 化で解決。
 *
 * 内容を変更する場合は `installer/src/templates/settings-hooks.json` も同期すること
 * （後者は仕様上の単一情報源として残す）。
 */
const SETTINGS_HOOKS_TEMPLATE: ClaudeSettings = {
  hooks: {
    SessionStart: [
      { hooks: [{ type: 'command', command: 'node ${HOOKS_DIR}/aidd-log-session-start.js' }] },
    ],
    UserPromptSubmit: [
      { hooks: [{ type: 'command', command: 'node ${HOOKS_DIR}/aidd-log-prompt.js' }] },
    ],
    SubagentStart: [
      { hooks: [{ type: 'command', command: 'node ${HOOKS_DIR}/aidd-log-subagent-start.js' }] },
    ],
    SubagentStop: [
      { hooks: [{ type: 'command', command: 'node ${HOOKS_DIR}/aidd-log-subagent-stop.js' }] },
    ],
    SessionEnd: [
      { hooks: [{ type: 'command', command: 'node ${HOOKS_DIR}/aidd-log-session-end.js' }] },
    ],
    Stop: [
      { hooks: [{ type: 'command', command: 'node ${HOOKS_DIR}/aidd-log-stop.js' }] },
    ],
  },
};

/**
 * `runInstall` のオプション。CLI flags が直接渡される。
 */
export interface InstallOptions {
  apiUrl?: string;
  apiKey?: string;
  email?: string;
  scope?: Scope;
  force?: boolean;
  /** commander が `--no-healthcheck` を `healthcheck: false` として渡す */
  healthcheck?: boolean;
  noHealthcheck?: boolean;
  dryRun?: boolean;
}

/**
 * `collectAnswers` で確定した最終値。
 */
interface ResolvedAnswers {
  apiUrl: string;
  apiKey: string;
  email: string;
  scope: Scope;
}

/**
 * `runInstall` の戻り値。CLI からは戻り値を使わないが、テストで検証するために返す。
 */
export interface InstallResult {
  hooksDir: string;
  settingsPath: string;
  configPath: string;
  merged: ClaudeSettings;
  backupPath?: string;
  healthcheckOk?: boolean;
  healthcheckError?: string;
  dryRun: boolean;
}

/**
 * インストールフロー本体。
 */
export async function runInstall(opts: InstallOptions = {}): Promise<InstallResult> {
  const dryRun = opts.dryRun === true;
  const skipHealthcheck = opts.noHealthcheck === true || opts.healthcheck === false;

  const answers = await collectAnswers(opts);

  const pathOpts = { scope: answers.scope };
  const claudeHome = getClaudeHome(pathOpts);
  const hooksDir = getHooksDir(pathOpts);
  const settingsPath = getSettingsPath(pathOpts);
  const configPath = getConfigPath(pathOpts);

  if (dryRun) {
    console.log(kleur.cyan('[dry-run] 計画:'));
    console.log(`  claude home:  ${claudeHome}`);
    console.log(`  hooks dir:    ${hooksDir}`);
    console.log(`  settings:     ${settingsPath}`);
    console.log(`  config:       ${configPath}`);
  }

  if (!dryRun) {
    await fs.mkdir(hooksDir, { recursive: true });
    await fs.mkdir(path.join(hooksDir, 'shared'), { recursive: true });
  }

  const sourceHooksDir = resolvePackagedDir('hooks');
  if (!dryRun) {
    await copyHooksFiles(sourceHooksDir, hooksDir);
  }

  // テンプレは inline 定数（src/templates/settings-hooks.json と同期）。
  // mergeHookSettings は内部で deep clone するためテンプレ自体は変更されない。
  const mergeResult: MergeHookSettingsResult = await mergeHookSettings({
    settingsPath,
    hooksTemplate: SETTINGS_HOOKS_TEMPLATE,
    hooksDir,
    dryRun,
  });

  if (!dryRun) {
    await writeConfigJson(configPath, answers);
  }

  let healthcheckOk: boolean | undefined;
  let healthcheckError: string | undefined;
  if (!skipHealthcheck && !dryRun) {
    try {
      await healthcheck(answers.apiUrl, answers.apiKey);
      healthcheckOk = true;
    } catch (e: unknown) {
      healthcheckOk = false;
      healthcheckError = e instanceof Error ? e.message : String(e);
      console.warn(
        kleur.yellow(`[警告] 疎通チェック失敗: ${healthcheckError} (インストールは継続します)`),
      );
    }
  }

  printSummary({
    dryRun,
    hooksDir,
    settingsPath,
    configPath,
    backupPath: mergeResult.backupPath,
    healthcheckOk,
    healthcheckError,
    skipHealthcheck,
  });

  return {
    hooksDir,
    settingsPath,
    configPath,
    merged: mergeResult.merged,
    backupPath: mergeResult.backupPath,
    healthcheckOk,
    healthcheckError,
    dryRun,
  };
}

/**
 * CLI flags が揃っていればプロンプトせず、不足があれば対話で補完する。
 */
async function collectAnswers(opts: InstallOptions): Promise<ResolvedAnswers> {
  const haveAll = typeof opts.apiUrl === 'string' && typeof opts.apiKey === 'string';
  if (haveAll) {
    return {
      apiUrl: opts.apiUrl as string,
      apiKey: opts.apiKey as string,
      email: opts.email ?? '',
      scope: (opts.scope ?? 'user') as Scope,
    };
  }

  const questions: prompts.PromptObject[] = [];
  if (typeof opts.apiUrl !== 'string') {
    questions.push({
      type: 'text',
      name: 'apiUrl',
      message: 'API サーバーの URL',
      validate: (v: string) =>
        typeof v === 'string' && /^https?:\/\//.test(v) ? true : 'http(s):// で始まる URL を入力してください',
    });
  }
  if (typeof opts.apiKey !== 'string') {
    questions.push({
      type: 'password',
      name: 'apiKey',
      message: 'API キー',
      validate: (v: string) => (typeof v === 'string' && v.length > 0 ? true : '空のキーは設定できません'),
    });
  }
  if (typeof opts.email !== 'string') {
    questions.push({
      type: 'text',
      name: 'email',
      message: 'Claude アカウントのメール（任意）',
      initial: '',
    });
  }
  if (typeof opts.scope !== 'string') {
    questions.push({
      type: 'select',
      name: 'scope',
      message: 'インストール先',
      choices: [
        { title: 'ユーザー全体 (~/.claude)', value: 'user' },
        { title: 'プロジェクト限定 (.claude)', value: 'project' },
      ],
      initial: 0,
    });
  }

  const responses = questions.length > 0 ? await prompts(questions) : {};

  const apiUrl = (opts.apiUrl ?? (responses.apiUrl as string | undefined)) ?? '';
  const apiKey = (opts.apiKey ?? (responses.apiKey as string | undefined)) ?? '';
  const email = opts.email ?? (responses.email as string | undefined) ?? '';
  const scope = (opts.scope ?? (responses.scope as Scope | undefined) ?? 'user') as Scope;

  if (!apiUrl) {
    throw new Error('API URL が指定されていません');
  }
  if (!apiKey) {
    throw new Error('API キーが指定されていません');
  }

  return { apiUrl, apiKey, email, scope };
}

/**
 * パッケージ内の同梱リソースの絶対パスを返す。
 *
 * - 開発時: `installer/dist/commands/install.js` から `../..` で `installer/`
 * - npm パッケージ展開時: 同様に `dist/commands/install.js` の 2 階層上
 *
 * `installer/hooks/` と `installer/src/templates/` の両方が `package.json` の
 * `files` に含まれているため、どちらの参照もパッケージから解決可能。
 */
function resolvePackagedDir(relative: string): string {
  // import.meta.dirname は Node 20.11+ で利用可能。CI/対象環境ともに >=18 だが、
  // 古い Node では fileURLToPath で fallback する。
  const here =
    (import.meta as unknown as { dirname?: string }).dirname ??
    path.dirname(fileURLToPath(import.meta.url));

  // here = installer/dist/commands。../../ → installer/
  return path.resolve(here, '..', '..', relative);
}

/**
 * `installer/hooks/` 配下を `hooksDir` に再帰コピーする。
 * `.js` と `.gitkeep` のみが対象。
 */
async function copyHooksFiles(sourceDir: string, targetDir: string): Promise<void> {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(sourceDir, entry.name);
    const dst = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await fs.mkdir(dst, { recursive: true });
      await copyHooksFiles(src, dst);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (!entry.name.endsWith('.js') && entry.name !== '.gitkeep') {
      continue;
    }
    await fs.copyFile(src, dst);
    if (entry.name.endsWith('.js') && process.platform !== 'win32') {
      // 実行権限は不要（`node <path>` 経由で起動するため）だが、
      // 念のため 644 に正規化しておく
      await fs.chmod(dst, 0o644);
    }
  }
}

/**
 * `~/.claude/hooks/config.json` を書き出す。
 *
 * 既存があっても上書き（API キー更新の運用を考慮）。
 * 非 Windows では `chmod 600` で API キーを保護する。
 */
async function writeConfigJson(configPath: string, answers: ResolvedAnswers): Promise<void> {
  const config = {
    api_url: answers.apiUrl,
    api_key: answers.apiKey,
    claude_email: answers.email,
  };

  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  if (process.platform !== 'win32') {
    await fs.chmod(configPath, 0o600);
  }
}

/**
 * `POST /api/hook/session-start` にダミーペイロードを投げ 2xx を確認する。
 *
 * 5 秒タイムアウト。失敗は throw（呼び出し側で警告に降格）。
 */
async function healthcheck(apiUrl: string, apiKey: string): Promise<void> {
  const url = new URL('/api/hook/session-start', apiUrl);
  const lib = url.protocol === 'https:' ? https : http;

  const body = JSON.stringify({
    session_uuid: `install-healthcheck-${Date.now()}`,
    started_at: new Date().toISOString(),
  });

  await new Promise<void>((resolve, reject) => {
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
        if (status >= 200 && status < 300) {
          resolve();
        } else {
          reject(new Error(`HTTP ${status}`));
        }
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

interface SummaryArgs {
  dryRun: boolean;
  hooksDir: string;
  settingsPath: string;
  configPath: string;
  backupPath: string | undefined;
  healthcheckOk: boolean | undefined;
  healthcheckError: string | undefined;
  skipHealthcheck: boolean;
}

function printSummary(args: SummaryArgs): void {
  if (args.dryRun) {
    console.log(kleur.cyan('\n[dry-run] 完了（ファイル変更なし）'));
    return;
  }

  console.log(kleur.green('\n✓ インストール完了'));
  console.log(`  hooks dir:    ${args.hooksDir}`);
  console.log(`  settings:     ${args.settingsPath}`);
  console.log(`  config:       ${args.configPath}`);
  if (args.backupPath) {
    console.log(`  backup:       ${args.backupPath}`);
  }
  if (args.skipHealthcheck) {
    console.log('  healthcheck:  skipped');
  } else if (args.healthcheckOk === true) {
    console.log(`  healthcheck:  ${kleur.green('OK')}`);
  } else if (args.healthcheckOk === false) {
    console.log(`  healthcheck:  ${kleur.yellow('FAILED')}${args.healthcheckError ? ` (${args.healthcheckError})` : ''}`);
  }
}
