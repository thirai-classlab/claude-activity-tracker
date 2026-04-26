/**
 * `runUninstall` の統合テスト。
 *
 * 実 ~/.claude には触れず、`os.tmpdir()` 配下に偽 home を作成し
 * `CLAUDE_HOME` env で path 解決を上書きする。
 *
 * カバー範囲（受入 U1〜U4）:
 *   - U1: install 後 uninstall → hooks/* / shared/utils.js 削除、settings.json 自社エントリ除去
 *   - U2: 他社 hook 共存状態で uninstall → 他社 hook と他のトップレベル設定保持
 *   - U3: --purge で config.json 削除
 *   - U4: --restore-backup で latest .bak.* から settings.json 復元
 */
import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import prompts from 'prompts';

import { runInstall } from '../src/commands/install.js';
import { runUninstall } from '../src/commands/uninstall.js';
import type { ClaudeSettings } from '../src/lib/settings-merger.js';

const originalClaudeHome = process.env.CLAUDE_HOME;

/**
 * uninstall / install 実行時のログ（printSummary, prompts）が node:test の
 * IPC チャンネルに混じると Node v22 で稀に「Unable to deserialize cloned data」
 * が発生する。テスト中は stdout への書き込みを no-op にして影響を遮断する。
 */
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const noopWrite: typeof process.stdout.write = () => true;

let tmpRoot: string;

before(() => {
  // process.stdout.write は overload union のため代入には型アサーションが必要
  (process.stdout as { write: typeof process.stdout.write }).write = noopWrite;
});

after(() => {
  process.stdout.write = originalStdoutWrite;
  if (originalClaudeHome === undefined) {
    delete process.env.CLAUDE_HOME;
  } else {
    process.env.CLAUDE_HOME = originalClaudeHome;
  }
});

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aidd-uninstall-'));
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

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

const HOOK_SCRIPTS = [
  'aidd-log-session-start.js',
  'aidd-log-session-end.js',
  'aidd-log-prompt.js',
  'aidd-log-stop.js',
  'aidd-log-subagent-start.js',
  'aidd-log-subagent-stop.js',
];

async function installFresh(): Promise<void> {
  await runInstall({
    apiUrl: 'http://127.0.0.1:1',
    apiKey: 'test-key',
    email: 'alice@example.com',
    scope: 'user',
    noHealthcheck: true,
  });
}

describe('runUninstall (integration)', () => {
  describe('U1: install 後 uninstall', () => {
    it('hook scripts / shared/utils.js / 自社 settings エントリ が削除される', async () => {
      await installFresh();

      // install 後の確認
      for (const name of HOOK_SCRIPTS) {
        assert.equal(
          await fileExists(path.join(tmpRoot, 'hooks', name)),
          true,
          `${name} should exist after install`,
        );
      }
      assert.equal(
        await fileExists(path.join(tmpRoot, 'hooks', 'shared', 'utils.js')),
        true,
      );

      const result = await runUninstall({ yes: true, scope: 'user' });
      assert.equal(result.cancelled, false);

      // hook scripts 削除確認
      for (const name of HOOK_SCRIPTS) {
        assert.equal(
          await fileExists(path.join(tmpRoot, 'hooks', name)),
          false,
          `${name} should be removed`,
        );
      }
      assert.equal(result.removedHookScripts.length, HOOK_SCRIPTS.length);

      // shared/utils.js 削除確認
      assert.equal(
        await fileExists(path.join(tmpRoot, 'hooks', 'shared', 'utils.js')),
        false,
      );
      // shared/ ディレクトリ rmdir 確認（空になったはず）
      assert.equal(result.removedSharedDir, true);
      assert.equal(await fileExists(path.join(tmpRoot, 'hooks', 'shared')), false);

      // settings.json から自社 hook エントリ除去
      const settingsRaw = await fs.readFile(path.join(tmpRoot, 'settings.json'), 'utf8');
      const settings = JSON.parse(settingsRaw) as ClaudeSettings;
      // 全部自社エントリだったので hooks キー自体が消える
      assert.equal(settings.hooks, undefined);
      assert.equal(result.strippedSettings, true);

      // config.json は --purge 無しなので保持
      assert.equal(
        await fileExists(path.join(tmpRoot, 'hooks', 'config.json')),
        true,
        'config.json should be retained without --purge',
      );
      assert.equal(result.removedConfig, false);
    });
  });

  describe('U2: 他社 hook 共存状態で uninstall', () => {
    it('他社 hook と他のトップレベル設定が保持される', async () => {
      const settingsPath = path.join(tmpRoot, 'settings.json');
      // 他社 hook + permissions を含む settings.json を作成してから install
      const preexisting: ClaudeSettings = {
        hooks: {
          SessionStart: [
            { hooks: [{ type: 'command', command: 'bash my-other-tool.sh' }] },
          ],
          PostToolUse: [
            {
              matcher: 'Edit',
              hooks: [{ type: 'command', command: 'eslint --fix $FILE' }],
            },
          ],
        },
        permissions: { allow: ['Read', 'Edit'] },
        env: { FOO: 'bar' },
      };
      await fs.writeFile(settingsPath, JSON.stringify(preexisting, null, 2), 'utf8');

      await installFresh();

      const result = await runUninstall({ yes: true, scope: 'user' });
      assert.equal(result.cancelled, false);
      assert.equal(result.strippedSettings, true);

      const settingsRaw = await fs.readFile(settingsPath, 'utf8');
      const settings = JSON.parse(settingsRaw) as ClaudeSettings;

      // 他社 hook は残る
      const sessionStart = settings.hooks?.SessionStart ?? [];
      const sessionStartCmds = sessionStart.flatMap((m) => m.hooks).map((h) => h.command);
      assert.deepEqual(sessionStartCmds, ['bash my-other-tool.sh']);

      const postToolUse = settings.hooks?.PostToolUse ?? [];
      const postToolUseCmds = postToolUse.flatMap((m) => m.hooks).map((h) => h.command);
      assert.deepEqual(postToolUseCmds, ['eslint --fix $FILE']);
      // matcher も保持
      assert.equal(postToolUse[0]?.matcher, 'Edit');

      // 自社のみ event（UserPromptSubmit 等）はキー自体が消える
      assert.equal(settings.hooks?.UserPromptSubmit, undefined);
      assert.equal(settings.hooks?.Stop, undefined);
      assert.equal(settings.hooks?.SessionEnd, undefined);
      assert.equal(settings.hooks?.PreToolUse, undefined);

      // 他のトップレベル設定保持
      assert.deepEqual(settings.permissions, { allow: ['Read', 'Edit'] });
      assert.deepEqual(settings.env, { FOO: 'bar' });

      // hook scripts は削除
      for (const name of HOOK_SCRIPTS) {
        assert.equal(await fileExists(path.join(tmpRoot, 'hooks', name)), false);
      }
    });
  });

  describe('U3: --purge', () => {
    it('config.json も削除される', async () => {
      await installFresh();
      const configPath = path.join(tmpRoot, 'hooks', 'config.json');
      assert.equal(await fileExists(configPath), true, 'config exists pre-uninstall');

      const result = await runUninstall({ yes: true, scope: 'user', purge: true });
      assert.equal(result.cancelled, false);
      assert.equal(result.removedConfig, true);
      assert.equal(await fileExists(configPath), false);
    });

    it('--purge 無しでは config.json は保持される', async () => {
      await installFresh();
      const configPath = path.join(tmpRoot, 'hooks', 'config.json');

      const result = await runUninstall({ yes: true, scope: 'user' });
      assert.equal(result.removedConfig, false);
      assert.equal(await fileExists(configPath), true);
    });
  });

  describe('U4: --restore-backup', () => {
    it('latest .bak.* から settings.json を復元する', async () => {
      const settingsPath = path.join(tmpRoot, 'settings.json');

      // 元 settings（他社 hook 入り）
      const original: ClaudeSettings = {
        hooks: {
          SessionStart: [{ hooks: [{ type: 'command', command: 'bash other.sh' }] }],
        },
        permissions: { allow: ['Read'] },
      };
      await fs.writeFile(settingsPath, JSON.stringify(original, null, 2), 'utf8');

      await installFresh();
      // install 後は backup ファイルが存在し、settings.json は merged 状態
      const dirEntries = await fs.readdir(tmpRoot);
      const backupName = dirEntries.find((n) => n.startsWith('settings.json.bak.'));
      assert.ok(backupName, `backup should exist after install, got: ${dirEntries.join(',')}`);

      // install 後の settings.json は自社 hook 入り
      const afterInstall = JSON.parse(
        await fs.readFile(settingsPath, 'utf8'),
      ) as ClaudeSettings;
      const events = Object.keys(afterInstall.hooks ?? {});
      assert.equal(events.length, 6);

      // restore-backup
      const result = await runUninstall({
        yes: true,
        scope: 'user',
        restoreBackup: true,
      });
      assert.equal(result.cancelled, false);
      assert.ok(result.restoredFromBackup, 'restoredFromBackup should be set');
      assert.equal(
        path.basename(result.restoredFromBackup!),
        backupName,
        'should restore from latest backup',
      );

      // settings.json は元の状態に戻っている
      const restored = JSON.parse(
        await fs.readFile(settingsPath, 'utf8'),
      ) as ClaudeSettings;
      assert.deepEqual(restored, original);

      // hook scripts は削除済み
      for (const name of HOOK_SCRIPTS) {
        assert.equal(await fileExists(path.join(tmpRoot, 'hooks', name)), false);
      }
      // strippedSettings は false（restore-backup 経路なので）
      assert.equal(result.strippedSettings, false);
    });

    it('複数 backup がある場合は最新（辞書順最後）を使う', async () => {
      const settingsPath = path.join(tmpRoot, 'settings.json');
      // 古い backup
      await fs.writeFile(
        `${settingsPath}.bak.20200101-000000`,
        JSON.stringify({ marker: 'old' }, null, 2),
        'utf8',
      );
      // 新しい backup
      await fs.writeFile(
        `${settingsPath}.bak.20990101-000000`,
        JSON.stringify({ marker: 'new' }, null, 2),
        'utf8',
      );
      // settings.json 自体は別の内容
      await fs.writeFile(settingsPath, JSON.stringify({ marker: 'current' }), 'utf8');

      const result = await runUninstall({
        yes: true,
        scope: 'user',
        restoreBackup: true,
      });
      assert.match(result.restoredFromBackup ?? '', /20990101-000000$/);

      const restored = JSON.parse(
        await fs.readFile(settingsPath, 'utf8'),
      ) as { marker: string };
      assert.equal(restored.marker, 'new');
    });

    it('backup が見つからない場合は throw', async () => {
      // settings.json も backup も無い
      await assert.rejects(
        () =>
          runUninstall({ yes: true, scope: 'user', restoreBackup: true }),
        /バックアップが見つかりません/,
      );
    });
  });

  describe('追加: 確認プロンプト', () => {
    it('--yes 無しで prompts が false を返すと cancelled=true、ファイルは保持', async () => {
      await installFresh();
      prompts.inject([false]);

      const result = await runUninstall({ scope: 'user' });
      assert.equal(result.cancelled, true);

      for (const name of HOOK_SCRIPTS) {
        assert.equal(
          await fileExists(path.join(tmpRoot, 'hooks', name)),
          true,
          `${name} should remain when cancelled`,
        );
      }
    });

    it('--yes 無しで prompts が true を返すと実行される', async () => {
      await installFresh();
      prompts.inject([true]);

      const result = await runUninstall({ scope: 'user' });
      assert.equal(result.cancelled, false);
      assert.equal(result.removedHookScripts.length, HOOK_SCRIPTS.length);
    });
  });

  describe('追加: 不在ファイル耐性', () => {
    it('install せずに uninstall しても throw しない（冪等）', async () => {
      const result = await runUninstall({ yes: true, scope: 'user' });
      assert.equal(result.cancelled, false);
      assert.equal(result.removedHookScripts.length, 0);
      assert.equal(result.strippedSettings, false);
    });
  });
});
