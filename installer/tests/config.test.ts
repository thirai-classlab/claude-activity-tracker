/**
 * `config` サブコマンド群の単体テスト。
 *
 * 実 ~/.claude には触れず、`os.tmpdir()` 配下に偽 home を作成し
 * `CLAUDE_HOME` env で path 解決を上書きする。
 *
 * カバー範囲:
 *   - C1: list で api_key がマスクされる（先頭 4 文字 + ***）
 *   - C2: get で既存値取得（api_key はマスク表示）
 *   - C3: set で値更新 + atomic write + chmod 600 維持
 *   - C4: 不正キーは rejected（exitCode=1、書き込みなし）
 *   - C5: 不在 config.json で適切なエラー
 */
import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  runConfigList,
  runConfigGet,
  runConfigSet,
} from '../src/commands/config.js';

const originalClaudeHome = process.env.CLAUDE_HOME;

let tmpRoot: string;
let configPath: string;

/** stdout / stderr / exitCode を一時的にキャプチャするヘルパ。 */
interface Capture {
  stdout: string[];
  stderr: string[];
  restore: () => void;
}

function captureConsole(): Capture {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const originalLog = console.log;
  const originalErr = console.error;
  const originalWarn = console.warn;
  console.log = (msg: unknown) => {
    stdout.push(typeof msg === 'string' ? msg : String(msg));
  };
  console.error = (msg: unknown) => {
    stderr.push(typeof msg === 'string' ? msg : String(msg));
  };
  console.warn = (msg: unknown) => {
    stderr.push(typeof msg === 'string' ? msg : String(msg));
  };

  return {
    stdout,
    stderr,
    restore: () => {
      console.log = originalLog;
      console.error = originalErr;
      console.warn = originalWarn;
    },
  };
}

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aidd-config-'));
  process.env.CLAUDE_HOME = tmpRoot;
  configPath = path.join(tmpRoot, 'hooks', 'config.json');
  // 親 exitCode を毎回リセット
  process.exitCode = 0;
});

afterEach(async () => {
  if (originalClaudeHome === undefined) {
    delete process.env.CLAUDE_HOME;
  } else {
    process.env.CLAUDE_HOME = originalClaudeHome;
  }
  await fs.rm(tmpRoot, { recursive: true, force: true });
  process.exitCode = 0;
});

after(() => {
  if (originalClaudeHome === undefined) {
    delete process.env.CLAUDE_HOME;
  } else {
    process.env.CLAUDE_HOME = originalClaudeHome;
  }
});

async function writeConfig(data: Record<string, unknown>): Promise<void> {
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(data, null, 2), 'utf8');
  if (process.platform !== 'win32') {
    await fs.chmod(configPath, 0o600);
  }
}

describe('runConfigList (C1)', () => {
  it('全項目を表示し、api_key は先頭 4 文字 + *** にマスクされる', async () => {
    await writeConfig({
      api_url: 'https://example.com',
      api_key: 'abcdefghijklmnop',
      claude_email: 'alice@example.com',
    });

    const cap = captureConsole();
    try {
      await runConfigList({ scope: 'user' });
    } finally {
      cap.restore();
    }

    const joined = cap.stdout.join('\n');
    assert.match(joined, /api_url: https:\/\/example\.com/);
    assert.match(joined, /api_key: abcd\*\*\*/);
    // 平文が漏れていないこと
    assert.equal(joined.includes('abcdefghijklmnop'), false);
    assert.match(joined, /claude_email: alice@example\.com/);
    assert.equal(process.exitCode ?? 0, 0);
  });
});

describe('runConfigGet (C2)', () => {
  it('既存値を 1 項目だけ返す（api_url）', async () => {
    await writeConfig({
      api_url: 'https://api.example.com',
      api_key: 'wxyz1234',
      claude_email: 'bob@example.com',
    });

    const cap = captureConsole();
    try {
      await runConfigGet('api_url', { scope: 'user' });
    } finally {
      cap.restore();
    }

    assert.equal(cap.stdout.length, 1);
    assert.equal(cap.stdout[0], 'https://api.example.com');
    assert.equal(process.exitCode ?? 0, 0);
  });

  it('api_key 取得時はマスクされる', async () => {
    await writeConfig({
      api_url: 'https://api.example.com',
      api_key: 'wxyz1234567890',
      claude_email: 'bob@example.com',
    });

    const cap = captureConsole();
    try {
      await runConfigGet('api_key', { scope: 'user' });
    } finally {
      cap.restore();
    }

    assert.equal(cap.stdout.length, 1);
    assert.equal(cap.stdout[0], 'wxyz***');
    // 平文が出力されていない
    assert.equal(cap.stdout[0].includes('567890'), false);
  });
});

describe('runConfigSet (C3)', () => {
  it('値が更新され、atomic write + chmod 600 が維持される', async () => {
    await writeConfig({
      api_url: 'https://old.example.com',
      api_key: 'oldoldoldold',
      claude_email: 'old@example.com',
    });

    const cap = captureConsole();
    try {
      await runConfigSet('api_url', 'https://new.example.com', {
        scope: 'user',
      });
    } finally {
      cap.restore();
    }

    // ファイル更新の確認
    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    assert.equal(parsed.api_url, 'https://new.example.com');
    // 他項目は保持
    assert.equal(parsed.api_key, 'oldoldoldold');
    assert.equal(parsed.claude_email, 'old@example.com');

    // chmod 600（非 Windows のみ）
    if (process.platform !== 'win32') {
      const st = await fs.stat(configPath);
      const mode = st.mode & 0o777;
      assert.equal(mode, 0o600, `expected 0600, got 0${mode.toString(8)}`);
    }

    // tmp ファイル残骸がないこと（atomic rename 後）
    const hooksDir = path.join(tmpRoot, 'hooks');
    const entries = await fs.readdir(hooksDir);
    const tmpLeftover = entries.filter((n) => n.includes('.tmp.'));
    assert.deepEqual(tmpLeftover, []);

    assert.equal(process.exitCode ?? 0, 0);
  });

  it('config.json 不在でも新規作成できる', async () => {
    const cap = captureConsole();
    try {
      await runConfigSet('api_key', 'freshkey1234', { scope: 'user' });
    } finally {
      cap.restore();
    }

    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    assert.equal(parsed.api_key, 'freshkey1234');

    if (process.platform !== 'win32') {
      const st = await fs.stat(configPath);
      assert.equal(st.mode & 0o777, 0o600);
    }
  });
});

describe('runConfigSet — 不正キー (C4)', () => {
  it('未知のキーは exitCode=1 + ファイル書き換えなし', async () => {
    await writeConfig({
      api_url: 'https://example.com',
      api_key: 'abcdefgh',
      claude_email: 'alice@example.com',
    });

    const before = await fs.readFile(configPath, 'utf8');

    const cap = captureConsole();
    try {
      await runConfigSet('foo_bar', 'baz', { scope: 'user' });
    } finally {
      cap.restore();
    }

    assert.equal(process.exitCode, 1);
    const stderr = cap.stderr.join('\n');
    assert.match(stderr, /未知のキー/);

    // ファイルは書き換えられていない
    const after = await fs.readFile(configPath, 'utf8');
    assert.equal(after, before);
  });

  it('空文字 value も拒否される', async () => {
    await writeConfig({
      api_url: 'https://example.com',
      api_key: 'abcdefgh',
      claude_email: 'alice@example.com',
    });

    const cap = captureConsole();
    try {
      await runConfigSet('api_url', '', { scope: 'user' });
    } finally {
      cap.restore();
    }

    assert.equal(process.exitCode, 1);
  });
});

describe('runConfigList — 不在 config.json (C5)', () => {
  it('config.json が無いと exitCode=1 + エラーメッセージ', async () => {
    const cap = captureConsole();
    try {
      await runConfigList({ scope: 'user' });
    } finally {
      cap.restore();
    }

    assert.equal(process.exitCode, 1);
    const stderr = cap.stderr.join('\n');
    assert.match(stderr, /config\.json が見つかりません/);
  });

  it('runConfigGet も同様にエラー', async () => {
    const cap = captureConsole();
    try {
      await runConfigGet('api_url', { scope: 'user' });
    } finally {
      cap.restore();
    }

    assert.equal(process.exitCode, 1);
    const stderr = cap.stderr.join('\n');
    assert.match(stderr, /config\.json が見つかりません/);
  });
});
