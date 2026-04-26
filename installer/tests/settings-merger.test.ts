/**
 * mergeHookSettings の単体テスト。
 *
 * tmp ディレクトリに本物の settings.json を作成し、副作用込みで検証する。
 * 受入基準 I1〜I7 をカバー。
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  mergeHookSettings,
  type ClaudeSettings,
  type HookMatcher
} from '../src/lib/settings-merger.js';

// テンプレ（実物の templates/settings-hooks.json と同等）
const HOOKS_TEMPLATE: ClaudeSettings = {
  hooks: {
    SessionStart: [
      {
        hooks: [
          { type: 'command', command: 'node ${HOOKS_DIR}/aidd-log-session-start.js' }
        ]
      }
    ],
    UserPromptSubmit: [
      {
        hooks: [
          { type: 'command', command: 'node ${HOOKS_DIR}/aidd-log-prompt.js' }
        ]
      }
    ],
    PreToolUse: [
      {
        hooks: [
          { type: 'command', command: 'node ${HOOKS_DIR}/aidd-log-subagent-start.js' }
        ]
      }
    ],
    PostToolUse: [
      {
        hooks: [
          { type: 'command', command: 'node ${HOOKS_DIR}/aidd-log-subagent-stop.js' }
        ]
      }
    ],
    SessionEnd: [
      {
        hooks: [
          { type: 'command', command: 'node ${HOOKS_DIR}/aidd-log-session-end.js' }
        ]
      }
    ],
    Stop: [
      {
        hooks: [{ type: 'command', command: 'node ${HOOKS_DIR}/aidd-log-stop.js' }]
      }
    ]
  }
};

const HOOKS_TEMPLATE_EVENTS = Object.keys(HOOKS_TEMPLATE.hooks ?? {});

const HOOKS_DIR = '/home/test/.claude/hooks';

let tmpRoot: string;
let settingsPath: string;

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aidd-merger-'));
  settingsPath = path.join(tmpRoot, 'settings.json');
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

async function readJson(p: string): Promise<ClaudeSettings> {
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw) as ClaudeSettings;
}

function ownEntriesOf(matchers: HookMatcher[] | undefined): string[] {
  return (matchers ?? [])
    .flatMap((m) => m.hooks)
    .map((h) => h.command)
    .filter((c) => c.includes('aidd-log-'));
}

function foreignEntriesOf(matchers: HookMatcher[] | undefined): string[] {
  return (matchers ?? [])
    .flatMap((m) => m.hooks)
    .map((h) => h.command)
    .filter((c) => !c.includes('aidd-log-'));
}

describe('mergeHookSettings', () => {
  describe('I1: 空 settings.json（or 不在）', () => {
    it('settings.json 不在 → 新規作成、6 種 hook 登録', async () => {
      // Arrange
      // settings.json は存在しない

      // Act
      const result = await mergeHookSettings({
        settingsPath,
        hooksTemplate: HOOKS_TEMPLATE,
        hooksDir: HOOKS_DIR
      });

      // Assert
      const onDisk = await readJson(settingsPath);
      const events = Object.keys(onDisk.hooks ?? {});
      assert.deepEqual(events.sort(), HOOKS_TEMPLATE_EVENTS.sort());
      assert.equal(events.length, 6);
      // 各 event に自社 hook が 1 件ある
      for (const event of HOOKS_TEMPLATE_EVENTS) {
        const own = ownEntriesOf(onDisk.hooks?.[event]);
        assert.equal(own.length, 1, `${event} should have 1 own entry`);
      }
      assert.deepEqual(result.merged, onDisk);
      // 不在ファイルなのでバックアップは作られない
      assert.equal(result.backupPath, undefined);
    });

    it('空 JSON {} の settings.json → 新規 hook 登録', async () => {
      // Arrange
      await fs.writeFile(settingsPath, '{}', 'utf8');

      // Act
      const result = await mergeHookSettings({
        settingsPath,
        hooksTemplate: HOOKS_TEMPLATE,
        hooksDir: HOOKS_DIR
      });

      // Assert
      const onDisk = await readJson(settingsPath);
      assert.equal(Object.keys(onDisk.hooks ?? {}).length, 6);
      assert.ok(result.backupPath, 'backup should be created');
      const backupRaw = await fs.readFile(result.backupPath!, 'utf8');
      assert.equal(backupRaw, '{}');
    });
  });

  describe('I2: 他社 hook 同居', () => {
    it('既存の他社 hook を保持、自社 hook を末尾追加', async () => {
      // Arrange
      const existing: ClaudeSettings = {
        hooks: {
          SessionStart: [
            {
              hooks: [{ type: 'command', command: 'bash my-other-tool.sh' }]
            }
          ],
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                { type: 'command', command: 'node /custom/foreign-pre.js' }
              ]
            }
          ]
        },
        // 他のトップレベル設定も保持されることを確認
        permissions: { allow: ['Read'] }
      };
      await fs.writeFile(settingsPath, JSON.stringify(existing, null, 2), 'utf8');

      // Act
      await mergeHookSettings({
        settingsPath,
        hooksTemplate: HOOKS_TEMPLATE,
        hooksDir: HOOKS_DIR
      });

      // Assert
      const onDisk = await readJson(settingsPath);
      // 他社 hook 残存
      assert.deepEqual(foreignEntriesOf(onDisk.hooks?.SessionStart), [
        'bash my-other-tool.sh'
      ]);
      assert.deepEqual(foreignEntriesOf(onDisk.hooks?.PreToolUse), [
        'node /custom/foreign-pre.js'
      ]);
      // 自社 hook 追加
      assert.equal(ownEntriesOf(onDisk.hooks?.SessionStart).length, 1);
      assert.equal(ownEntriesOf(onDisk.hooks?.PreToolUse).length, 1);
      // 他のトップレベル設定保持
      assert.deepEqual(onDisk.permissions, { allow: ['Read'] });
    });
  });

  describe('I3: upsert（再 merge で重複しない）', () => {
    it('既に自社 hook がある settings → 重複させずに 1 件に保つ', async () => {
      // Arrange — 1 回目の merge
      await mergeHookSettings({
        settingsPath,
        hooksTemplate: HOOKS_TEMPLATE,
        hooksDir: HOOKS_DIR
      });
      const after1st = await readJson(settingsPath);

      // Act — 2 回目の merge（パス変更含む）
      const newHooksDir = '/home/test/.claude/hooks-v2';
      await mergeHookSettings({
        settingsPath,
        hooksTemplate: HOOKS_TEMPLATE,
        hooksDir: newHooksDir
      });

      // Assert
      const after2nd = await readJson(settingsPath);
      for (const event of HOOKS_TEMPLATE_EVENTS) {
        const own = ownEntriesOf(after2nd.hooks?.[event]);
        assert.equal(own.length, 1, `${event} should still have exactly 1 own entry`);
        assert.ok(
          own[0].includes(newHooksDir),
          `${event} should be updated to new hooksDir, got: ${own[0]}`
        );
      }
      // 1 回目とは別物（path が更新されている）
      assert.notDeepEqual(after1st, after2nd);
    });

    it('他社 hook と並存している状態で upsert → 他社残存 + 自社 1 件', async () => {
      // Arrange
      const existing: ClaudeSettings = {
        hooks: {
          SessionStart: [
            { hooks: [{ type: 'command', command: 'bash my-other-tool.sh' }] },
            // 既存の自社 hook（古い path）
            {
              hooks: [
                {
                  type: 'command',
                  command: 'node /old/path/aidd-log-session-start.js'
                }
              ]
            }
          ]
        }
      };
      await fs.writeFile(settingsPath, JSON.stringify(existing), 'utf8');

      // Act
      await mergeHookSettings({
        settingsPath,
        hooksTemplate: HOOKS_TEMPLATE,
        hooksDir: HOOKS_DIR
      });

      // Assert
      const onDisk = await readJson(settingsPath);
      assert.deepEqual(foreignEntriesOf(onDisk.hooks?.SessionStart), [
        'bash my-other-tool.sh'
      ]);
      const own = ownEntriesOf(onDisk.hooks?.SessionStart);
      assert.equal(own.length, 1);
      assert.ok(own[0].includes(HOOKS_DIR));
      assert.ok(!own[0].includes('/old/path/'));
    });
  });

  describe('I4: 無効 JSON', () => {
    it('構文エラーの settings.json → throw、既存ファイル保護', async () => {
      // Arrange
      const broken = '{ this is not valid JSON }';
      await fs.writeFile(settingsPath, broken, 'utf8');

      // Act & Assert
      await assert.rejects(
        () =>
          mergeHookSettings({
            settingsPath,
            hooksTemplate: HOOKS_TEMPLATE,
            hooksDir: HOOKS_DIR
          }),
        /Failed to parse/
      );

      // 既存ファイルは触られていない
      const stillThere = await fs.readFile(settingsPath, 'utf8');
      assert.equal(stillThere, broken);
      // バックアップも tmp も残っていない
      const siblings = await fs.readdir(tmpRoot);
      assert.deepEqual(siblings, ['settings.json']);
    });

    it('JSON 配列は object でないため throw', async () => {
      // Arrange
      await fs.writeFile(settingsPath, '[]', 'utf8');

      // Act & Assert
      await assert.rejects(
        () =>
          mergeHookSettings({
            settingsPath,
            hooksTemplate: HOOKS_TEMPLATE,
            hooksDir: HOOKS_DIR
          }),
        /must be a JSON object/
      );
    });
  });

  describe('I5: dryRun', () => {
    it('dryRun=true → ファイルに書かれず、merged が返る', async () => {
      // Arrange
      const existing: ClaudeSettings = { theme: 'dark' };
      await fs.writeFile(settingsPath, JSON.stringify(existing), 'utf8');

      // Act
      const result = await mergeHookSettings({
        settingsPath,
        hooksTemplate: HOOKS_TEMPLATE,
        hooksDir: HOOKS_DIR,
        dryRun: true
      });

      // Assert
      // ファイルは変更されていない
      const onDisk = await readJson(settingsPath);
      assert.deepEqual(onDisk, existing);
      // バックアップも作られない
      const siblings = await fs.readdir(tmpRoot);
      assert.deepEqual(siblings, ['settings.json']);
      assert.equal(result.backupPath, undefined);
      // merged は hook 入りの最終形
      assert.equal(Object.keys(result.merged.hooks ?? {}).length, 6);
      assert.equal(result.merged.theme, 'dark');
    });

    it('dryRun=true で settings.json 不在 → I/O なし、merged 返る', async () => {
      // Arrange — 不在のまま

      // Act
      const result = await mergeHookSettings({
        settingsPath,
        hooksTemplate: HOOKS_TEMPLATE,
        hooksDir: HOOKS_DIR,
        dryRun: true
      });

      // Assert
      await assert.rejects(() => fs.access(settingsPath));
      assert.equal(result.backupPath, undefined);
      assert.equal(Object.keys(result.merged.hooks ?? {}).length, 6);
    });
  });

  describe('I6: バックアップ', () => {
    it('既定サフィックスで .bak.YYYYMMDD-HHMMSS が作られる', async () => {
      // Arrange
      const original = JSON.stringify({ existing: true });
      await fs.writeFile(settingsPath, original, 'utf8');

      // Act
      const result = await mergeHookSettings({
        settingsPath,
        hooksTemplate: HOOKS_TEMPLATE,
        hooksDir: HOOKS_DIR
      });

      // Assert
      assert.ok(result.backupPath);
      assert.match(
        path.basename(result.backupPath!),
        /^settings\.json\.bak\.\d{8}-\d{6}$/
      );
      const backupRaw = await fs.readFile(result.backupPath!, 'utf8');
      assert.equal(backupRaw, original);
    });

    it('カスタム backupSuffix を使える', async () => {
      // Arrange
      await fs.writeFile(settingsPath, '{}', 'utf8');

      // Act
      const result = await mergeHookSettings({
        settingsPath,
        hooksTemplate: HOOKS_TEMPLATE,
        hooksDir: HOOKS_DIR,
        backupSuffix: '.bak.test-fixed'
      });

      // Assert
      assert.equal(result.backupPath, `${settingsPath}.bak.test-fixed`);
      const backupRaw = await fs.readFile(result.backupPath!, 'utf8');
      assert.equal(backupRaw, '{}');
    });
  });

  describe('I7: ${HOOKS_DIR} 展開', () => {
    it('command 内のプレースホルダが正しく展開される', async () => {
      // Arrange
      const customDir = '/Users/alice/.claude/hooks';

      // Act
      await mergeHookSettings({
        settingsPath,
        hooksTemplate: HOOKS_TEMPLATE,
        hooksDir: customDir
      });

      // Assert
      const onDisk = await readJson(settingsPath);
      for (const event of HOOKS_TEMPLATE_EVENTS) {
        const own = ownEntriesOf(onDisk.hooks?.[event]);
        assert.equal(own.length, 1);
        assert.ok(
          own[0].startsWith(`node ${customDir}/aidd-log-`),
          `expected expansion for ${event}, got: ${own[0]}`
        );
        assert.ok(
          !own[0].includes('${HOOKS_DIR}'),
          `placeholder should be fully replaced in ${event}`
        );
      }
    });

    it('テンプレに同じプレースホルダが複数回出ても全置換', async () => {
      // Arrange
      const repeatTemplate: ClaudeSettings = {
        hooks: {
          SessionStart: [
            {
              hooks: [
                {
                  type: 'command',
                  command:
                    'node ${HOOKS_DIR}/aidd-log-session-start.js --shared ${HOOKS_DIR}/shared'
                }
              ]
            }
          ]
        }
      };

      // Act
      const result = await mergeHookSettings({
        settingsPath,
        hooksTemplate: repeatTemplate,
        hooksDir: HOOKS_DIR,
        dryRun: true
      });

      // Assert
      const cmd = result.merged.hooks?.SessionStart?.[0]?.hooks?.[0]?.command ?? '';
      assert.ok(!cmd.includes('${HOOKS_DIR}'));
      assert.equal(
        cmd,
        `node ${HOOKS_DIR}/aidd-log-session-start.js --shared ${HOOKS_DIR}/shared`
      );
    });

    it('テンプレ自身は変更されない（非破壊）', async () => {
      // Arrange
      const snapshot = JSON.parse(JSON.stringify(HOOKS_TEMPLATE));

      // Act
      await mergeHookSettings({
        settingsPath,
        hooksTemplate: HOOKS_TEMPLATE,
        hooksDir: HOOKS_DIR,
        dryRun: true
      });

      // Assert
      assert.deepEqual(HOOKS_TEMPLATE, snapshot);
    });
  });
});
