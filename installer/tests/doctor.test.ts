/**
 * `runDoctor` の統合テスト。
 *
 * 実 ~/.claude には触れず、`os.tmpdir()` 配下に偽 home を作成し
 * `CLAUDE_HOME` env で path 解決を上書きする。fake API は `http.createServer`。
 *
 * カバー範囲:
 *   D1: 全 OK 状態 → exitCode 0
 *   D2: hook ファイル欠損 → ERROR、exitCode 2
 *   D3: settings.json 構文エラー → ERROR、exitCode 2
 *   D4: API 疎通失敗 → WARN（exitCode 0、警告のみ）
 */
import { describe, it, beforeEach, afterEach, after } from 'node:test';
import * as assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';

import { runDoctor } from '../src/commands/doctor.js';

const originalClaudeHome = process.env.CLAUDE_HOME;

let tmpRoot: string;
let logs: string[];
let originalLog: typeof console.log;

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aidd-doctor-'));
  process.env.CLAUDE_HOME = tmpRoot;
  logs = [];
  originalLog = console.log;
  console.log = (msg?: unknown) => {
    logs.push(typeof msg === 'string' ? msg : String(msg));
  };
});

afterEach(async () => {
  console.log = originalLog;
  if (originalClaudeHome === undefined) {
    delete process.env.CLAUDE_HOME;
  } else {
    process.env.CLAUDE_HOME = originalClaudeHome;
  }
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

after(() => {
  if (originalClaudeHome === undefined) {
    delete process.env.CLAUDE_HOME;
  } else {
    process.env.CLAUDE_HOME = originalClaudeHome;
  }
});

interface FakeServer {
  url: string;
  close: () => Promise<void>;
}

async function startFakeServer(status: number): Promise<FakeServer> {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => {
      body += c;
    });
    req.on('end', () => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: status < 400 }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${addr.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

const HOOK_FILES = [
  'aidd-log-session-start.js',
  'aidd-log-session-end.js',
  'aidd-log-prompt.js',
  'aidd-log-stop.js',
  'aidd-log-subagent-start.js',
  'aidd-log-subagent-stop.js',
];

const HOOK_EVENTS_TEMPLATE = (hooksDir: string) => ({
  hooks: {
    SessionStart: [
      { hooks: [{ type: 'command', command: `node ${hooksDir}/aidd-log-session-start.js` }] },
    ],
    UserPromptSubmit: [
      { hooks: [{ type: 'command', command: `node ${hooksDir}/aidd-log-prompt.js` }] },
    ],
    PreToolUse: [
      { hooks: [{ type: 'command', command: `node ${hooksDir}/aidd-log-subagent-start.js` }] },
    ],
    PostToolUse: [
      { hooks: [{ type: 'command', command: `node ${hooksDir}/aidd-log-subagent-stop.js` }] },
    ],
    SessionEnd: [
      { hooks: [{ type: 'command', command: `node ${hooksDir}/aidd-log-session-end.js` }] },
    ],
    Stop: [
      { hooks: [{ type: 'command', command: `node ${hooksDir}/aidd-log-stop.js` }] },
    ],
  },
});

/**
 * 偽 home に正常な hooks dir / settings.json / config.json を構築する。
 */
async function setupHealthyEnv(apiUrl: string): Promise<void> {
  const hooksDir = path.join(tmpRoot, 'hooks');
  await fs.mkdir(path.join(hooksDir, 'shared'), { recursive: true });
  for (const name of HOOK_FILES) {
    await fs.writeFile(path.join(hooksDir, name), '// stub\n', 'utf8');
  }
  await fs.writeFile(
    path.join(hooksDir, 'shared', 'utils.js'),
    '// stub utils\n',
    'utf8',
  );

  const settings = HOOK_EVENTS_TEMPLATE(hooksDir);
  await fs.writeFile(
    path.join(tmpRoot, 'settings.json'),
    JSON.stringify(settings, null, 2),
    'utf8',
  );

  const config = {
    api_url: apiUrl,
    api_key: 'test-key',
    claude_email: 'alice@example.com',
  };
  const configPath = path.join(hooksDir, 'config.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
  if (process.platform !== 'win32') {
    await fs.chmod(configPath, 0o600);
  }
}

function joinedLogs(): string {
  return logs.join('\n');
}

describe('runDoctor', () => {
  describe('D1: 全 OK 状態', () => {
    it('exitCode 0 を返し、各段階に [OK] が出力される', async () => {
      const fake = await startFakeServer(200);
      try {
        await setupHealthyEnv(fake.url);
        const code = await runDoctor({ scope: 'user' });
        assert.equal(code, 0, `unexpected logs:\n${joinedLogs()}`);

        const out = joinedLogs();
        assert.match(out, /Node v/);
        assert.match(out, /package version:/);
        assert.match(out, /hooks dir:/);
        assert.match(out, /6\/6 hook scripts present/);
        assert.match(out, /shared\/utils\.js present/);
        assert.match(out, /6\/6 hook events registered/);
        assert.match(out, /api_url, api_key OK/);
        assert.match(out, /API health: 200 OK/);
        assert.match(out, /Summary: \d+ OK, \d+ WARN, 0 ERROR/);
      } finally {
        await fake.close();
      }
    });
  });

  describe('D2: hook ファイル欠損', () => {
    it('ERROR を出力し exitCode 2 を返す', async () => {
      const fake = await startFakeServer(200);
      try {
        await setupHealthyEnv(fake.url);
        // 1 件削除
        await fs.unlink(path.join(tmpRoot, 'hooks', 'aidd-log-prompt.js'));

        const code = await runDoctor({ scope: 'user' });
        assert.equal(code, 2, `unexpected logs:\n${joinedLogs()}`);

        const out = joinedLogs();
        assert.match(out, /5\/6 hook scripts present/);
        assert.match(out, /aidd-log-prompt\.js/);
        assert.match(out, /Summary: \d+ OK, \d+ WARN, [1-9]\d* ERROR/);
      } finally {
        await fake.close();
      }
    });
  });

  describe('D3: settings.json 構文エラー', () => {
    it('ERROR を出力し exitCode 2 を返す', async () => {
      const fake = await startFakeServer(200);
      try {
        await setupHealthyEnv(fake.url);
        // 不正 JSON で上書き
        await fs.writeFile(
          path.join(tmpRoot, 'settings.json'),
          '{ this is not json',
          'utf8',
        );

        const code = await runDoctor({ scope: 'user' });
        assert.equal(code, 2, `unexpected logs:\n${joinedLogs()}`);

        const out = joinedLogs();
        assert.match(out, /settings\.json: invalid JSON/);
      } finally {
        await fake.close();
      }
    });
  });

  describe('D4: API 疎通失敗', () => {
    it('500 応答 → WARN、exitCode 0', async () => {
      const fake = await startFakeServer(500);
      try {
        await setupHealthyEnv(fake.url);
        const code = await runDoctor({ scope: 'user' });
        assert.equal(code, 0, `unexpected logs:\n${joinedLogs()}`);

        const out = joinedLogs();
        assert.match(out, /API health: 500/);
        assert.match(out, /Summary: \d+ OK, [1-9]\d* WARN, 0 ERROR/);
      } finally {
        await fake.close();
      }
    });

    it('未到達 URL → WARN、exitCode 0', async () => {
      // 起動しないサーバーの URL を使う（ループバック + 確実に閉じている port）
      // listen(0) で空 port を取得 → 即 close して未到達 URL を作る
      const probe = http.createServer();
      await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
      const addr = probe.address() as AddressInfo;
      const deadUrl = `http://127.0.0.1:${addr.port}`;
      await new Promise<void>((resolve, reject) => {
        probe.close((err) => (err ? reject(err) : resolve()));
      });

      await setupHealthyEnv(deadUrl);
      const code = await runDoctor({ scope: 'user' });
      assert.equal(code, 0, `unexpected logs:\n${joinedLogs()}`);

      const out = joinedLogs();
      assert.match(out, /API health:/);
      assert.match(out, /Summary: \d+ OK, [1-9]\d* WARN, 0 ERROR/);
    });
  });

  describe('config.json missing keys', () => {
    it('api_url 空 → ERROR、API 疎通スキップ', async () => {
      await fs.mkdir(path.join(tmpRoot, 'hooks', 'shared'), { recursive: true });
      for (const name of HOOK_FILES) {
        await fs.writeFile(path.join(tmpRoot, 'hooks', name), '// stub\n', 'utf8');
      }
      await fs.writeFile(
        path.join(tmpRoot, 'hooks', 'shared', 'utils.js'),
        '// stub\n',
        'utf8',
      );

      const hooksDir = path.join(tmpRoot, 'hooks');
      const settings = HOOK_EVENTS_TEMPLATE(hooksDir);
      await fs.writeFile(
        path.join(tmpRoot, 'settings.json'),
        JSON.stringify(settings, null, 2),
        'utf8',
      );

      const config = { api_url: '', api_key: 'k', claude_email: '' };
      const configPath = path.join(tmpRoot, 'hooks', 'config.json');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
      if (process.platform !== 'win32') {
        await fs.chmod(configPath, 0o600);
      }

      const code = await runDoctor({ scope: 'user' });
      assert.equal(code, 2, `unexpected logs:\n${joinedLogs()}`);

      const out = joinedLogs();
      assert.match(out, /missing or empty keys: api_url/);
      assert.match(out, /API health: skipped/);
    });
  });
});
