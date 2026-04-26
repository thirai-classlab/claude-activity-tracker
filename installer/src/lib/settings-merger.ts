/**
 * settings.json のマージユーティリティ。
 *
 * 既存 `~/.claude/settings.json` の hook ブロックに、本パッケージが配布する
 * 6 種の hook を冪等に追加する。自社判定は command 文字列の `aidd-log-` 部分。
 *
 * 仕様の原典: docs/specs/003-npx-installer.md `settings.json マージ戦略`
 */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

export interface HookEntry {
  type: 'command';
  command: string;
}

export interface HookMatcher {
  matcher?: string;
  hooks: HookEntry[];
}

export interface ClaudeSettings {
  hooks?: Record<string, HookMatcher[]>;
  [key: string]: unknown;
}

/** 自社 hook 判定マーカー */
const OWN_HOOK_MARKER = 'aidd-log-';
/** テンプレ内のディレクトリプレースホルダ */
const HOOKS_DIR_PLACEHOLDER = '${HOOKS_DIR}';

export interface MergeHookSettingsOptions {
  /** 既存 ~/.claude/settings.json のパス */
  settingsPath: string;
  /** templates/settings-hooks.json をパース済オブジェクト */
  hooksTemplate: ClaudeSettings;
  /** hooks ファイルの実 path（コマンド文字列に展開） */
  hooksDir: string;
  /** true ならファイルを書かず最終内容を return */
  dryRun?: boolean;
  /** バックアップサフィックス（既定 `.bak.YYYYMMDD-HHMMSS`） */
  backupSuffix?: string;
}

export interface MergeHookSettingsResult {
  merged: ClaudeSettings;
  backupPath?: string;
}

/**
 * 既存 settings.json に hooksTemplate の自社 hook を冪等にマージする。
 *
 * - dryRun=true: ファイル I/O なし、merged のみ返す
 * - dryRun=false: バックアップ → atomic write （tmp → rename） → 再パース検証
 *   - パース失敗時は tmp を削除して throw
 */
export async function mergeHookSettings(
  opts: MergeHookSettingsOptions
): Promise<MergeHookSettingsResult> {
  const {
    settingsPath,
    hooksTemplate,
    hooksDir,
    dryRun = false,
    backupSuffix
  } = opts;

  const existing = await readExistingSettings(settingsPath);
  const expandedTemplate = expandHooksDirPlaceholder(hooksTemplate, hooksDir);
  const merged = upsertHooks(existing, expandedTemplate);

  if (dryRun) {
    return { merged };
  }

  const backupPath = await createBackup(
    settingsPath,
    backupSuffix ?? defaultBackupSuffix()
  );

  await atomicWriteJson(settingsPath, merged, backupPath);

  return { merged, backupPath };
}

/**
 * 既存 settings.json を読み込む。存在しなければ {} を返す。
 * 無効 JSON の場合は throw（呼び出し側はバックアップ未作成のため既存ファイルは保護される）。
 */
async function readExistingSettings(settingsPath: string): Promise<ClaudeSettings> {
  let raw: string;
  try {
    raw = await fs.readFile(settingsPath, 'utf8');
  } catch (error: unknown) {
    if (isFsErrno(error, 'ENOENT')) {
      return {};
    }
    throw error;
  }

  if (raw.trim() === '') {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(
        `settings.json must be a JSON object, got: ${describeJsonShape(parsed)}`
      );
    }
    return parsed as ClaudeSettings;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse ${settingsPath}: ${message}`);
  }
}

/**
 * テンプレ内の `${HOOKS_DIR}` を hooksDir に展開した新オブジェクトを返す（不可変）。
 */
function expandHooksDirPlaceholder(
  template: ClaudeSettings,
  hooksDir: string
): ClaudeSettings {
  const templateHooks = template.hooks ?? {};
  const expandedHooks: Record<string, HookMatcher[]> = {};

  for (const [event, matchers] of Object.entries(templateHooks)) {
    expandedHooks[event] = matchers.map((matcher) => ({
      ...matcher,
      hooks: matcher.hooks.map((h) => ({
        ...h,
        command: h.command.split(HOOKS_DIR_PLACEHOLDER).join(hooksDir)
      }))
    }));
  }

  return {
    ...template,
    hooks: expandedHooks
  };
}

/**
 * existing.hooks に対して templateExpanded.hooks を upsert する。
 *
 * - 既存配列の自社（`aidd-log-` を含む）エントリを削除
 * - templateExpanded の各 event 末尾に追加
 * - 他社 hook はそのまま保持
 * - existing は変更せず、新オブジェクトを返す
 */
function upsertHooks(
  existing: ClaudeSettings,
  templateExpanded: ClaudeSettings
): ClaudeSettings {
  const existingHooks = existing.hooks ?? {};
  const templateHooks = templateExpanded.hooks ?? {};

  const mergedHooks: Record<string, HookMatcher[]> = {};

  // 既存 event を保持しつつ、テンプレ対象の event は自社エントリを除去
  for (const [event, matchers] of Object.entries(existingHooks)) {
    if (templateHooks[event]) {
      const filtered = stripOwnEntries(matchers);
      if (filtered.length > 0) {
        mergedHooks[event] = filtered;
      }
    } else {
      mergedHooks[event] = matchers.map(cloneMatcher);
    }
  }

  // テンプレ側を末尾に追加（cloneMatcher で参照分離）
  for (const [event, matchers] of Object.entries(templateHooks)) {
    const cloned = matchers.map(cloneMatcher);
    if (mergedHooks[event]) {
      mergedHooks[event] = [...mergedHooks[event], ...cloned];
    } else {
      mergedHooks[event] = cloned;
    }
  }

  return {
    ...existing,
    hooks: mergedHooks
  };
}

/**
 * matcher 配列から自社エントリを除去する。
 * - matcher.hooks 内の `aidd-log-` を含む command を除去
 * - 結果として hooks が空になった matcher は除去
 */
function stripOwnEntries(matchers: HookMatcher[]): HookMatcher[] {
  const result: HookMatcher[] = [];
  for (const matcher of matchers) {
    const remaining = matcher.hooks.filter((h) => !isOwnHookEntry(h));
    if (remaining.length > 0) {
      result.push({
        ...(matcher.matcher !== undefined ? { matcher: matcher.matcher } : {}),
        hooks: remaining.map((h) => ({ ...h }))
      });
    }
  }
  return result;
}

/**
 * 既存 settings から自社 hook エントリのみを除去した新オブジェクトを返す（不変）。
 *
 * - hooks 配下の各 event 内 matcher について `aidd-log-` を含む command を除去
 * - 空になった matcher は除去
 * - 全 matcher が消えた event はキー自体を削除
 * - hooks 全体が空になった場合は `hooks` キー自体を残さない
 * - hooks 以外のトップレベル設定はそのまま保持
 *
 * uninstall 時の settings strip ロジックとして使用する。
 */
export function stripOwnHookEntries(settings: ClaudeSettings): ClaudeSettings {
  const existingHooks = settings.hooks ?? {};
  const filteredHooks: Record<string, HookMatcher[]> = {};

  for (const [event, matchers] of Object.entries(existingHooks)) {
    const filtered = stripOwnEntries(matchers);
    if (filtered.length > 0) {
      filteredHooks[event] = filtered;
    }
  }

  const next: ClaudeSettings = { ...settings };
  if (Object.keys(filteredHooks).length > 0) {
    next.hooks = filteredHooks;
  } else {
    delete next.hooks;
  }
  return next;
}

function isOwnHookEntry(entry: HookEntry): boolean {
  return typeof entry.command === 'string' && entry.command.includes(OWN_HOOK_MARKER);
}

function cloneMatcher(matcher: HookMatcher): HookMatcher {
  return {
    ...(matcher.matcher !== undefined ? { matcher: matcher.matcher } : {}),
    hooks: matcher.hooks.map((h) => ({ ...h }))
  };
}

/**
 * 既存 settings.json を `${settingsPath}${suffix}` にコピーする。
 * 元ファイルが存在しなければ undefined を返す。
 */
async function createBackup(
  settingsPath: string,
  suffix: string
): Promise<string | undefined> {
  try {
    const data = await fs.readFile(settingsPath);
    const backupPath = `${settingsPath}${suffix}`;
    await fs.writeFile(backupPath, data);
    return backupPath;
  } catch (error: unknown) {
    if (isFsErrno(error, 'ENOENT')) {
      return undefined;
    }
    throw error;
  }
}

/**
 * tmp ファイルに JSON を書き、再パースで検証 → rename で原子的置換。
 * パース失敗時は tmp を削除し、必要ならバックアップから復元する旨を例外メッセージに含めて throw。
 */
async function atomicWriteJson(
  settingsPath: string,
  merged: ClaudeSettings,
  backupPath: string | undefined
): Promise<void> {
  const tmpPath = `${settingsPath}.tmp`;
  const serialized = `${JSON.stringify(merged, null, 2)}\n`;

  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(tmpPath, serialized, 'utf8');

  try {
    const verifyRaw = await fs.readFile(tmpPath, 'utf8');
    JSON.parse(verifyRaw);
  } catch (error: unknown) {
    await silentUnlink(tmpPath);
    const restoreNote = backupPath
      ? ` Existing settings preserved at ${backupPath}.`
      : ' Existing settings file unchanged.';
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Atomic write verification failed: ${message}.${restoreNote}`);
  }

  await fs.rename(tmpPath, settingsPath);
}

async function silentUnlink(p: string): Promise<void> {
  try {
    await fs.unlink(p);
  } catch {
    // 既に存在しないケースは無視
  }
}

function defaultBackupSuffix(now: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mi = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `.bak.${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function isFsErrno(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

function describeJsonShape(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}
