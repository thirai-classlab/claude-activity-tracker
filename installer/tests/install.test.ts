/**
 * `runInstall` の統合テスト。
 *
 * 実 ~/.claude には触れず、`os.tmpdir()` 配下に偽 home を作成し
 * `CLAUDE_HOME` env で path 解決を上書きする。
 *
 * ネットワーク I/O は in-process の HTTP server を立てて検証する。
 *
 * カバー範囲（受入 IT1〜IT4）:
 *   - IT1: --dry-run で実ファイル変更なし、merged 内容が返る
 *   - IT2: 不在 settings.json に install → hooks/* + settings + config 生成
 *   - IT3: 既存自社 hook 同居 settings に再 install → 重複なし（冪等）
 *   - IT4: healthcheck 失敗時もインストール完了（警告のみ）
 */
import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';

import { runInstall } from '../src/commands/install.js';
import type { ClaudeSettings, HookMatcher } from '../src/lib/settings-merger.js';

const originalClaudeHome = process.env.CLAUDE_HOME;

let tmpRoot: string;

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aidd-install-'));
  // tmpRoot をそのまま CLAUDE_HOME として使う（settings.json と hooks/ 相当を直下に作らせる）
  process.env.CLAUDE_HOME = tmpRoot;
});

afterEach(async () => {
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

/**
 * テスト用の HTTP サーバ。`status` で 200 / 500 を切り替え、
 * リクエスト数を `requests` で公開する。
 */
interface FakeServer {
  url: string;
  requests: { method: string; url: string; headers: http.IncomingHttpHeaders; body: string }[];
  close: () => Promise<void>;
}

async function startFakeServer(status: number): Promise<FakeServer> {
  const requests: FakeServer['requests'] = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      requests.push({
        method: req.method ?? '',
        url: req.url ?? '',
        headers: req.headers,
        body,
      });
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: status < 400 }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${addr.port}`;

  return {
    url,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

function ownEntries(matchers: HookMatcher[] | undefined): string[] {
  return (matchers ?? [])
    .flatMap((m) => m.hooks)
    .map((h) => h.command)
    .filter((c) => c.includes('aidd-log-'));
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

describe('runInstall (integration)', () => {
  describe('IT1: --dry-run', () => {
    it('実ファイル変更なし、merged が返る', async () => {
      const result = await runInstall({
        apiUrl: 'http://127.0.0.1:1', // 接続不可だが healthcheck は dryRun で skip される
        apiKey: 'test-key',
        email: 'alice@example.com',
        scope: 'user',
        dryRun: true,
        noHealthcheck: true,
      });

      assert.equal(result.dryRun, true);
      // settings.json / hooks dir / config.json はいずれも作られていない
      assert.equal(await fileExists(path.join(tmpRoot, 'settings.json')), false);
      assert.equal(await fileExists(path.join(tmpRoot, 'hooks', 'config.json')), false);
      // hooks ディレクトリ自体も dryRun では作らない
      assert.equal(await fileExists(path.join(tmpRoot, 'hooks')), false);
      // merged は hook 6 種の最終形を含む
      const events = Object.keys(result.merged.hooks ?? {});
      assert.equal(events.length, 6);
      // healthcheck は実行していない（skip）
      assert.equal(result.healthcheckOk, undefined);
    });
  });

  describe('IT2: 不在 settings.json に install', () => {
    it('hooks/* + settings.json + config.json が生成される', async () => {
      const fake = await startFakeServer(200);
      try {
        const result = await runInstall({
          apiUrl: fake.url,
          apiKey: 'install-key',
          email: 'bob@example.com',
          scope: 'user',
        });

        // hooks ファイルが 6 種コピーされている
        const expectedHooks = [
          'aidd-log-session-start.js',
          'aidd-log-session-end.js',
          'aidd-log-prompt.js',
          'aidd-log-stop.js',
          'aidd-log-subagent-start.js',
          'aidd-log-subagent-stop.js',
        ];
        for (const name of expectedHooks) {
          assert.equal(
            await fileExists(path.join(tmpRoot, 'hooks', name)),
            true,
            `${name} should be copied`,
          );
        }
        // shared/utils.js もコピー
        assert.equal(
          await fileExists(path.join(tmpRoot, 'hooks', 'shared', 'utils.js')),
          true,
          'shared/utils.js should be copied',
        );

        // settings.json が新規作成され、6 event すべてに自社 hook がある
        const settingsRaw = await fs.readFile(path.join(tmpRoot, 'settings.json'), 'utf8');
        const settings = JSON.parse(settingsRaw) as ClaudeSettings;
        const events = Object.keys(settings.hooks ?? {});
        assert.equal(events.length, 6);
        for (const event of events) {
          const own = ownEntries(settings.hooks?.[event]);
          assert.equal(own.length, 1, `${event} should have 1 own entry`);
          assert.ok(own[0].includes(path.join(tmpRoot, 'hooks')), `${event} should reference hooksDir`);
        }
        // 不在 → backup なし
        assert.equal(result.backupPath, undefined);

        // config.json
        const configRaw = await fs.readFile(path.join(tmpRoot, 'hooks', 'config.json'), 'utf8');
        const config = JSON.parse(configRaw) as Record<string, unknown>;
        assert.equal(config.api_url, fake.url);
        assert.equal(config.api_key, 'install-key');
        assert.equal(config.claude_email, 'bob@example.com');

        // chmod 600（非 Windows のみ）
        if (process.platform !== 'win32') {
          const st = await fs.stat(path.join(tmpRoot, 'hooks', 'config.json'));
          // 下位 9 bit を取り出す
          const mode = st.mode & 0o777;
          assert.equal(mode, 0o600, `config.json should be 0600, got 0${mode.toString(8)}`);
        }

        // healthcheck 1 回成功
        assert.equal(fake.requests.length, 1);
        assert.equal(fake.requests[0].method, 'POST');
        assert.equal(fake.requests[0].url, '/api/hook/session-start');
        assert.equal(fake.requests[0].headers['x-api-key'], 'install-key');
        assert.equal(result.healthcheckOk, true);
      } finally {
        await fake.close();
      }
    });
  });

  describe('IT3: 既存自社 hook + 他社 hook → 再 install で冪等', () => {
    it('自社は 1 件に保ち、他社は保持される', async () => {
      // 1 回目（他社 hook を含む settings.json を予め作成）
      const settingsPath = path.join(tmpRoot, 'settings.json');
      const preexisting: ClaudeSettings = {
        hooks: {
          SessionStart: [
            {
              hooks: [{ type: 'command', command: 'bash my-other-tool.sh' }],
            },
          ],
        },
        permissions: { allow: ['Read'] },
      };
      await fs.writeFile(settingsPath, JSON.stringify(preexisting, null, 2), 'utf8');

      // 1 回目 install
      await runInstall({
        apiUrl: 'http://127.0.0.1:1',
        apiKey: 'k1',
        scope: 'user',
        noHealthcheck: true,
      });

      const after1stRaw = await fs.readFile(settingsPath, 'utf8');
      const after1st = JSON.parse(after1stRaw) as ClaudeSettings;
      assert.equal(ownEntries(after1st.hooks?.SessionStart).length, 1);
      // 他社 hook 残存
      const foreignSession = (after1st.hooks?.SessionStart ?? [])
        .flatMap((m) => m.hooks)
        .map((h) => h.command)
        .filter((c) => !c.includes('aidd-log-'));
      assert.deepEqual(foreignSession, ['bash my-other-tool.sh']);

      // 2 回目 install
      await runInstall({
        apiUrl: 'http://127.0.0.1:1',
        apiKey: 'k2',
        scope: 'user',
        noHealthcheck: true,
      });

      const after2ndRaw = await fs.readFile(settingsPath, 'utf8');
      const after2nd = JSON.parse(after2ndRaw) as ClaudeSettings;

      // 自社 hook は依然 1 件
      for (const event of Object.keys(after2nd.hooks ?? {})) {
        const own = ownEntries(after2nd.hooks?.[event]);
        assert.equal(own.length, 1, `${event} should still have exactly 1 own entry`);
      }
      // 他社 hook 残存
      const foreignSession2 = (after2nd.hooks?.SessionStart ?? [])
        .flatMap((m) => m.hooks)
        .map((h) => h.command)
        .filter((c) => !c.includes('aidd-log-'));
      assert.deepEqual(foreignSession2, ['bash my-other-tool.sh']);
      // 他のトップレベル設定保持
      assert.deepEqual(after2nd.permissions, { allow: ['Read'] });

      // 2 回目では config.json の api_key が更新されている
      const cfg2 = JSON.parse(
        await fs.readFile(path.join(tmpRoot, 'hooks', 'config.json'), 'utf8'),
      ) as Record<string, unknown>;
      assert.equal(cfg2.api_key, 'k2');
    });
  });

  describe('IT4: healthcheck 失敗', () => {
    it('500 を返してもインストールは完了し、警告フラグだけ立つ', async () => {
      const fake = await startFakeServer(500);
      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (msg: unknown) => {
        warnings.push(typeof msg === 'string' ? msg : String(msg));
      };

      try {
        const result = await runInstall({
          apiUrl: fake.url,
          apiKey: 'k',
          scope: 'user',
        });

        assert.equal(result.healthcheckOk, false);
        assert.match(result.healthcheckError ?? '', /HTTP 500/);
        assert.ok(
          warnings.some((w) => w.includes('疎通チェック失敗')),
          `expected warning, got: ${warnings.join(' / ')}`,
        );
        // それでも settings.json と config.json は生成されている
        assert.equal(await fileExists(path.join(tmpRoot, 'settings.json')), true);
        assert.equal(
          await fileExists(path.join(tmpRoot, 'hooks', 'config.json')),
          true,
        );
      } finally {
        console.warn = originalWarn;
        await fake.close();
      }
    });

    it('--no-healthcheck flag では fetch 自体が走らない', async () => {
      const fake = await startFakeServer(200);
      try {
        const result = await runInstall({
          apiUrl: fake.url,
          apiKey: 'k',
          scope: 'user',
          noHealthcheck: true,
        });

        assert.equal(result.healthcheckOk, undefined);
        assert.equal(fake.requests.length, 0);
      } finally {
        await fake.close();
      }
    });
  });
});
