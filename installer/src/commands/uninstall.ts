/**
 * `aidd-tracker uninstall` — hooks の除去と settings.json のロールバック。
 *
 * 設計: docs/specs/003-npx-installer.md `uninstall` 節
 *
 * 処理:
 *   1. 確認プロンプト（--yes でスキップ）
 *   2. settings.json 処理:
 *      - --restore-backup: 最新 *.bak.* から復元
 *      - 通常: 自社 aidd-log-* エントリのみ除去（atomic write）
 *   3. hooks/aidd-log-*.js 6 種を削除
 *   4. hooks/shared/utils.js 削除（存在チェック後）
 *   5. shared/ ディレクトリが空なら rmdir
 *   6. --purge 時のみ config.json 削除
 *   7. サマリ出力
 *
 * 実 ~/.claude には触れず、テストでは CLAUDE_HOME env で偽 home を指定可能。
 */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
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
  stripOwnHookEntries,
  type ClaudeSettings,
} from '../lib/settings-merger.js';

/**
 * Hook script ファイル名（6 種）。
 */
const OWN_HOOK_SCRIPTS = [
  'aidd-log-session-start.js',
  'aidd-log-session-end.js',
  'aidd-log-prompt.js',
  'aidd-log-stop.js',
  'aidd-log-subagent-start.js',
  'aidd-log-subagent-stop.js',
] as const;

const SHARED_DIRNAME = 'shared';
const SHARED_UTILS_FILENAME = 'utils.js';

/**
 * `runUninstall` のオプション。CLI flags が直接渡される。
 */
export interface UninstallOptions {
  scope?: Scope;
  /** 確認プロンプトをスキップ */
  yes?: boolean;
  /** config.json も削除 */
  purge?: boolean;
  /** 最新バックアップから settings.json を復元 */
  restoreBackup?: boolean;
}

/**
 * `runUninstall` の戻り値。CLI からは戻り値を使わないが、テストで検証するために返す。
 */
export interface UninstallResult {
  /** 実行が確認プロンプトでキャンセルされた場合 true */
  cancelled: boolean;
  hooksDir: string;
  settingsPath: string;
  configPath: string;
  /** 削除済み hook script の絶対パス */
  removedHookScripts: string[];
  /** shared/utils.js を削除した場合の絶対パス */
  removedSharedUtils?: string;
  /** shared/ ディレクトリを rmdir した場合 true */
  removedSharedDir: boolean;
  /** settings.json から自社エントリを除去した場合 true */
  strippedSettings: boolean;
  /** バックアップから settings.json を復元した場合の元 backup path */
  restoredFromBackup?: string;
  /** config.json を削除した場合 true（--purge） */
  removedConfig: boolean;
}

/**
 * アンインストールフロー本体。
 */
export async function runUninstall(opts: UninstallOptions = {}): Promise<UninstallResult> {
  const scope: Scope = opts.scope ?? 'user';
  const pathOpts = { scope };
  const claudeHome = getClaudeHome(pathOpts);
  const hooksDir = getHooksDir(pathOpts);
  const settingsPath = getSettingsPath(pathOpts);
  const configPath = getConfigPath(pathOpts);

  if (opts.yes !== true) {
    const confirmed = await confirmUninstall(claudeHome, opts);
    if (!confirmed) {
      console.log(kleur.yellow('アンインストールを中止しました。'));
      return {
        cancelled: true,
        hooksDir,
        settingsPath,
        configPath,
        removedHookScripts: [],
        removedSharedDir: false,
        strippedSettings: false,
        removedConfig: false,
      };
    }
  }

  // 1. settings.json 処理（hook script 削除より先に行う：仮に途中失敗しても settings は整合）
  let strippedSettings = false;
  let restoredFromBackup: string | undefined;
  if (opts.restoreBackup === true) {
    restoredFromBackup = await restoreLatestBackup(settingsPath);
  } else {
    strippedSettings = await stripSettings(settingsPath);
  }

  // 2. hooks/aidd-log-*.js 削除
  const removedHookScripts: string[] = [];
  for (const name of OWN_HOOK_SCRIPTS) {
    const target = path.join(hooksDir, name);
    if (await tryUnlink(target)) {
      removedHookScripts.push(target);
    }
  }

  // 3. shared/utils.js 削除
  const sharedDir = path.join(hooksDir, SHARED_DIRNAME);
  const sharedUtilsPath = path.join(sharedDir, SHARED_UTILS_FILENAME);
  let removedSharedUtils: string | undefined;
  if (await tryUnlink(sharedUtilsPath)) {
    removedSharedUtils = sharedUtilsPath;
  }

  // 4. shared/ が空なら rmdir
  let removedSharedDir = false;
  if (await isDirEmpty(sharedDir)) {
    try {
      await fs.rmdir(sharedDir);
      removedSharedDir = true;
    } catch (error: unknown) {
      // 競合等で rmdir 失敗しても致命的ではないため警告のみ
      if (!isFsErrno(error, 'ENOENT') && !isFsErrno(error, 'ENOTEMPTY')) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(kleur.yellow(`[警告] shared/ rmdir 失敗: ${message}`));
      }
    }
  }

  // 5. --purge: config.json 削除
  let removedConfig = false;
  if (opts.purge === true) {
    if (await tryUnlink(configPath)) {
      removedConfig = true;
    }
  }

  printSummary({
    hooksDir,
    settingsPath,
    configPath,
    removedHookScripts,
    removedSharedUtils,
    removedSharedDir,
    strippedSettings,
    restoredFromBackup,
    removedConfig,
    purge: opts.purge === true,
  });

  return {
    cancelled: false,
    hooksDir,
    settingsPath,
    configPath,
    removedHookScripts,
    removedSharedUtils,
    removedSharedDir,
    strippedSettings,
    restoredFromBackup,
    removedConfig,
  };
}

/**
 * 確認プロンプト。`--yes` 指定時は呼ばれない。
 */
async function confirmUninstall(claudeHome: string, opts: UninstallOptions): Promise<boolean> {
  const actions: string[] = [
    `${claudeHome} 配下から hook script (6 種) と shared/utils.js を削除`,
    'settings.json から自社 hook エントリを除去',
  ];
  if (opts.restoreBackup === true) {
    actions[1] = 'settings.json を最新バックアップから復元';
  }
  if (opts.purge === true) {
    actions.push('config.json を削除（--purge）');
  }

  console.log(kleur.cyan('以下を実行します:'));
  for (const a of actions) {
    console.log(`  - ${a}`);
  }

  const response = await prompts({
    type: 'confirm',
    name: 'ok',
    message: 'アンインストールを実行しますか?',
    initial: false,
  });

  return response.ok === true;
}

/**
 * settings.json から自社 hook エントリのみを除去する（atomic write）。
 *
 * - 不在 → 何もせず false
 * - 自社エントリが既に無い → 書き込みスキップで false
 * - 除去実施 → atomic write で true
 */
async function stripSettings(settingsPath: string): Promise<boolean> {
  const existing = await readSettings(settingsPath);
  if (existing === undefined) {
    return false;
  }

  const stripped = stripOwnHookEntries(existing);

  if (deepEqual(existing, stripped)) {
    // 自社エントリ無し（あるいは settings 自体に hooks 無し）→ 触らない
    return false;
  }

  await atomicWriteJson(settingsPath, stripped);
  return true;
}

/**
 * 最新の `${settingsPath}.bak.*` から復元する。
 *
 * - バックアップが見つからない場合は throw
 * - 復元成功時は使用した backup path を返す
 */
async function restoreLatestBackup(settingsPath: string): Promise<string> {
  const dir = path.dirname(settingsPath);
  const basename = path.basename(settingsPath);
  const prefix = `${basename}.bak.`;

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch (error: unknown) {
    if (isFsErrno(error, 'ENOENT')) {
      throw new Error(`バックアップが見つかりません: ${dir} は存在しません`);
    }
    throw error;
  }

  const candidates = entries
    .filter((name) => name.startsWith(prefix))
    .map((name) => path.join(dir, name))
    .sort(); // suffix は YYYYMMDD-HHMMSS 形式なので辞書順 = 時系列順

  if (candidates.length === 0) {
    throw new Error(`バックアップが見つかりません（${prefix}* in ${dir}）`);
  }

  const latest = candidates[candidates.length - 1];
  const data = await fs.readFile(latest);
  // 復元先ディレクトリが存在しない可能性は低いが念のため
  await fs.mkdir(dir, { recursive: true });
  // バックアップ自体は JSON とは限らないため verify せず、そのまま書き戻す
  // （install 時に保存した時点で valid だったはず）
  const tmpPath = `${settingsPath}.tmp`;
  await fs.writeFile(tmpPath, data);
  await fs.rename(tmpPath, settingsPath);

  return latest;
}

/**
 * settings.json を読む。不在は undefined。無効 JSON は throw。
 */
async function readSettings(settingsPath: string): Promise<ClaudeSettings | undefined> {
  let raw: string;
  try {
    raw = await fs.readFile(settingsPath, 'utf8');
  } catch (error: unknown) {
    if (isFsErrno(error, 'ENOENT')) {
      return undefined;
    }
    throw error;
  }

  if (raw.trim() === '') {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`settings.json must be a JSON object`);
    }
    return parsed as ClaudeSettings;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse ${settingsPath}: ${message}`);
  }
}

/**
 * tmp に書いてから rename で原子的置換。verify 用に再パースも行う。
 */
async function atomicWriteJson(settingsPath: string, data: ClaudeSettings): Promise<void> {
  const tmpPath = `${settingsPath}.tmp`;
  const serialized = `${JSON.stringify(data, null, 2)}\n`;

  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(tmpPath, serialized, 'utf8');

  try {
    const verifyRaw = await fs.readFile(tmpPath, 'utf8');
    JSON.parse(verifyRaw);
  } catch (error: unknown) {
    await silentUnlink(tmpPath);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Atomic write verification failed: ${message}`);
  }

  await fs.rename(tmpPath, settingsPath);
}

/**
 * unlink 試行。存在しない場合は false、削除成功は true。
 * その他のエラーは throw。
 */
async function tryUnlink(p: string): Promise<boolean> {
  try {
    await fs.unlink(p);
    return true;
  } catch (error: unknown) {
    if (isFsErrno(error, 'ENOENT')) {
      return false;
    }
    throw error;
  }
}

async function silentUnlink(p: string): Promise<void> {
  try {
    await fs.unlink(p);
  } catch {
    // 既に存在しないケースは無視
  }
}

/**
 * 指定ディレクトリが存在し、かつ中身が空なら true。
 */
async function isDirEmpty(dir: string): Promise<boolean> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch (error: unknown) {
    if (isFsErrno(error, 'ENOENT')) {
      return false;
    }
    throw error;
  }
  return entries.length === 0;
}

function isFsErrno(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

/**
 * 単純な構造比較（JSON で表現できる範囲のみ）。
 */
function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface SummaryArgs {
  hooksDir: string;
  settingsPath: string;
  configPath: string;
  removedHookScripts: string[];
  removedSharedUtils: string | undefined;
  removedSharedDir: boolean;
  strippedSettings: boolean;
  restoredFromBackup: string | undefined;
  removedConfig: boolean;
  purge: boolean;
}

function printSummary(args: SummaryArgs): void {
  console.log(kleur.green('\n✓ アンインストール完了'));
  console.log(`  hooks dir:    ${args.hooksDir}`);
  console.log(`  hook scripts: ${args.removedHookScripts.length} 件削除`);
  if (args.removedSharedUtils) {
    console.log(`  shared/utils.js: 削除`);
  }
  if (args.removedSharedDir) {
    console.log(`  shared/:      rmdir`);
  }
  if (args.restoredFromBackup) {
    console.log(`  settings:     ${args.settingsPath}`);
    console.log(`  restored from: ${args.restoredFromBackup}`);
  } else if (args.strippedSettings) {
    console.log(`  settings:     ${args.settingsPath} (自社 hook エントリ除去)`);
  } else {
    console.log(`  settings:     変更なし`);
  }
  if (args.purge) {
    console.log(`  config:       ${args.removedConfig ? '削除' : '対象なし'}`);
  } else {
    console.log(`  config:       保持（${args.configPath}）`);
  }
}
