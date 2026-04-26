/**
 * OS 別の Claude Code 設定パス解決。
 *
 * - macOS / Linux: `~/.claude/`
 * - Windows: `%USERPROFILE%\.claude\`
 *
 * `scope` で user / project を切り替え、`CLAUDE_HOME` 環境変数があれば最優先。
 *
 * 区切り文字は `node:path` の `join` を使うことで OS 依存性を吸収する。
 * Windows 検出も `process.platform === 'win32'` のみに依存し、
 * ホームディレクトリ展開は `os.homedir()` に委ねている。
 */
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * 解決スコープ。
 *
 * - `'user'`（既定）: ユーザーグローバルの `~/.claude`
 * - `'project'`: 引数 `cwd` 配下の `.claude`
 */
export type Scope = 'user' | 'project';

/**
 * 4 関数共通のオプション。
 */
export interface PathOptions {
  /** 解決スコープ。既定は `'user'`。 */
  scope?: Scope;
  /** `scope='project'` 時のベースディレクトリ。既定は `process.cwd()`。 */
  cwd?: string;
}

/**
 * `CLAUDE_HOME` 環境変数を最優先で参照する。
 *
 * 空文字や未設定の場合は `undefined` を返し、通常解決にフォールバックさせる。
 */
function readEnvOverride(): string | undefined {
  const value = process.env.CLAUDE_HOME;
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed;
}

/**
 * Claude Code 設定ディレクトリの絶対パスを返す。
 *
 * 解決優先順:
 *   1. `CLAUDE_HOME` 環境変数（最優先）
 *   2. `scope='project'` の場合は `<cwd>/.claude`
 *   3. それ以外は OS 既定:
 *      - macOS / Linux: `~/.claude`
 *      - Windows: `%USERPROFILE%\.claude`（`os.homedir()` が解決）
 */
export function getClaudeHome(opts: PathOptions = {}): string {
  const override = readEnvOverride();
  if (override !== undefined) {
    return override;
  }

  const scope: Scope = opts.scope ?? 'user';
  if (scope === 'project') {
    const base = opts.cwd ?? process.cwd();
    return join(base, '.claude');
  }

  return join(homedir(), '.claude');
}

/**
 * `<claudeHome>/settings.json` の絶対パスを返す。
 */
export function getSettingsPath(opts: PathOptions = {}): string {
  return join(getClaudeHome(opts), 'settings.json');
}

/**
 * `<claudeHome>/hooks` の絶対パスを返す。
 */
export function getHooksDir(opts: PathOptions = {}): string {
  return join(getClaudeHome(opts), 'hooks');
}

/**
 * `<claudeHome>/hooks/config.json` の絶対パスを返す。
 */
export function getConfigPath(opts: PathOptions = {}): string {
  return join(getHooksDir(opts), 'config.json');
}
