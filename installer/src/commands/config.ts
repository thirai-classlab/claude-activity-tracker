/**
 * `aidd-tracker config` — `~/.claude/hooks/config.json` の参照・編集。
 *
 * 設計: docs/specs/003-npx-installer.md `config コマンド` 節
 *
 * サブコマンド:
 *   - list:    現在の config.json を表示（api_key はマスク）
 *   - get:     1 項目を表示（api_key はマスク）
 *   - set:     1 項目を更新（atomic write + chmod 600）
 *   - migrate: 旧形式から新形式へ（現状想定なし → NOOP + 警告）
 *
 * 実 ~/.claude には触れず、テストでは `CLAUDE_HOME` env で偽 home を指定可能。
 */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import kleur from 'kleur';

import { getConfigPath, type Scope } from '../lib/paths.js';

/**
 * `config` サブコマンド名。CLI dispatcher で使う想定。
 */
export type ConfigSubcommand = 'list' | 'get' | 'set' | 'migrate';

/**
 * `config` 各関数の共通オプション。
 *
 * `scope` は `getConfigPath` にそのまま流す。未指定時は `'user'`。
 */
export interface ConfigOptions {
  scope?: Scope;
}

/**
 * `config.json` の正式スキーマ。
 *
 * 不明キーは `migrate` で警告対象。`set` で更新できるのもこの 3 キーのみ。
 */
interface ConfigSchema {
  api_url?: string;
  api_key?: string;
  claude_email?: string;
}

/** `set` で許可するキー一覧。 */
const ALLOWED_KEYS = ['api_url', 'api_key', 'claude_email'] as const;
type AllowedKey = (typeof ALLOWED_KEYS)[number];

function isAllowedKey(key: string): key is AllowedKey {
  return (ALLOWED_KEYS as readonly string[]).includes(key);
}

/**
 * api_key を「先頭 4 文字 + ***」に整形して表示する。
 *
 * 4 文字未満の値は全文 + `***`（短いキーでも整合性を優先しつつ平文を残さない）。
 * 空文字 / 未設定は `'(unset)'` を返す。
 */
function maskApiKey(value: string | undefined): string {
  if (typeof value !== 'string' || value.length === 0) {
    return '(unset)';
  }
  const head = value.slice(0, 4);
  return `${head}***`;
}

/**
 * `config.json` の読み込み。存在しなければ `null` を返す。
 *
 * JSON 不正は throw。`set` 等で必ず可読である前提。
 */
async function readConfig(configPath: string): Promise<ConfigSchema | null> {
  let raw: string;
  try {
    raw = await fs.readFile(configPath, 'utf8');
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return null;
    }
    throw error;
  }

  try {
    return JSON.parse(raw) as ConfigSchema;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`config.json の JSON パースに失敗しました: ${message}`);
  }
}

/**
 * `config.json` を atomic に書き込み、非 Windows では chmod 600 を維持する。
 *
 * 手順:
 *   1. 親ディレクトリ作成
 *   2. `<path>.tmp.<pid>.<ts>` に書き出し
 *   3. tmp に chmod 600 を適用（rename 後にも保証されるよう先に設定）
 *   4. `fs.rename` で原子置換（同一 FS 前提）
 *   5. 念のため最終ファイルにも chmod 600 を再適用
 */
async function writeConfigAtomic(
  configPath: string,
  data: ConfigSchema,
): Promise<void> {
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  const tmpPath = `${configPath}.tmp.${process.pid}.${Date.now()}`;
  const payload = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(tmpPath, payload, 'utf8');
  if (process.platform !== 'win32') {
    await fs.chmod(tmpPath, 0o600);
  }
  await fs.rename(tmpPath, configPath);
  if (process.platform !== 'win32') {
    await fs.chmod(configPath, 0o600);
  }
}

/**
 * `config list` — 全項目を表示。`api_key` はマスク。
 *
 * 不在 config.json は `process.exitCode = 1` + エラーメッセージ。
 */
export async function runConfigList(opts: ConfigOptions = {}): Promise<void> {
  const configPath = getConfigPath({ scope: opts.scope });
  const config = await readConfig(configPath);
  if (config === null) {
    console.error(
      kleur.red(`[error] config.json が見つかりません: ${configPath}`),
    );
    process.exitCode = 1;
    return;
  }

  console.log(kleur.cyan(`config.json (${configPath})`));
  for (const key of ALLOWED_KEYS) {
    const value = config[key];
    const display =
      key === 'api_key'
        ? maskApiKey(value)
        : typeof value === 'string' && value.length > 0
          ? value
          : '(unset)';
    console.log(`  ${key}: ${display}`);
  }
}

/**
 * `config get <key>` — 1 項目だけ表示。`api_key` はマスク。
 *
 * 不在 / 不正キー / 値未設定はそれぞれ exitCode=1。
 */
export async function runConfigGet(
  key: string,
  opts: ConfigOptions = {},
): Promise<void> {
  if (!isAllowedKey(key)) {
    console.error(
      kleur.red(
        `[error] 未知のキー: ${key} (許可: ${ALLOWED_KEYS.join(', ')})`,
      ),
    );
    process.exitCode = 1;
    return;
  }

  const configPath = getConfigPath({ scope: opts.scope });
  const config = await readConfig(configPath);
  if (config === null) {
    console.error(
      kleur.red(`[error] config.json が見つかりません: ${configPath}`),
    );
    process.exitCode = 1;
    return;
  }

  const value = config[key];
  if (typeof value !== 'string' || value.length === 0) {
    console.error(kleur.red(`[error] ${key} は未設定です`));
    process.exitCode = 1;
    return;
  }

  console.log(key === 'api_key' ? maskApiKey(value) : value);
}

/**
 * `config set <key> <value>` — 1 項目更新。
 *
 * - 許可キー以外は警告 + exitCode=1（書き込みはしない）
 * - 値の空文字列は禁止（unset したい場合は別途 `unset` を将来検討）
 * - 既存ファイル不在時は新規作成
 */
export async function runConfigSet(
  key: string,
  value: string,
  opts: ConfigOptions = {},
): Promise<void> {
  if (!isAllowedKey(key)) {
    console.error(
      kleur.red(
        `[error] 未知のキー: ${key} (許可: ${ALLOWED_KEYS.join(', ')})`,
      ),
    );
    process.exitCode = 1;
    return;
  }

  if (typeof value !== 'string' || value.length === 0) {
    console.error(kleur.red(`[error] 空の値は設定できません`));
    process.exitCode = 1;
    return;
  }

  const configPath = getConfigPath({ scope: opts.scope });
  const existing = (await readConfig(configPath)) ?? {};
  const next: ConfigSchema = { ...existing, [key]: value };
  await writeConfigAtomic(configPath, next);

  const display = key === 'api_key' ? maskApiKey(value) : value;
  console.log(kleur.green(`✓ ${key} を更新しました: ${display}`));
}

/**
 * `config migrate` — 旧形式 → 新形式。
 *
 * 現状の旧形式は未定義のため NOOP。新形式と互換であれば成功扱い、
 * 未知キーが混入していれば警告して終了（破壊しない）。
 */
export async function runConfigMigrate(
  opts: ConfigOptions = {},
): Promise<void> {
  const configPath = getConfigPath({ scope: opts.scope });
  const config = await readConfig(configPath);
  if (config === null) {
    console.error(
      kleur.red(`[error] config.json が見つかりません: ${configPath}`),
    );
    process.exitCode = 1;
    return;
  }

  const knownKeys = new Set<string>(ALLOWED_KEYS);
  const unknownKeys = Object.keys(config).filter((k) => !knownKeys.has(k));
  if (unknownKeys.length === 0) {
    console.log(
      kleur.green('✓ config.json は既に新形式です（移行不要）'),
    );
    return;
  }

  console.warn(
    kleur.yellow(
      `[警告] 未知のキーを検出: ${unknownKeys.join(', ')} — 自動移行ルールが未定義のため変更を加えませんでした`,
    ),
  );
}
