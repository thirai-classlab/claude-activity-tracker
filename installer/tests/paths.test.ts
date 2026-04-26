/**
 * paths.ts の単体テスト。
 *
 * - macOS/Linux 既定パス（P1）
 * - Windows 互換性（process.platform を 'win32' に差し替え, P2）
 * - `scope='project'`（P3）
 * - `CLAUDE_HOME` 環境変数 override（P4）
 * - 派生関数（settings / hooks / config, P5）
 */
import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { join } from 'node:path';

import {
  getClaudeHome,
  getSettingsPath,
  getHooksDir,
  getConfigPath,
} from '../src/lib/paths.js';

/**
 * テスト中に環境変数 / process.platform を一時的に書き換えるヘルパ。
 * `before` フックで現在値を退避し、`after` フックで復元する。
 */
const originalClaudeHome = process.env.CLAUDE_HOME;
const originalPlatform = process.platform;

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true,
  });
}

before(() => {
  // 現在の環境を保護: 各テストは setup/teardown で都度リセットする
  delete process.env.CLAUDE_HOME;
});

after(() => {
  // テストスイート終了時に元値を復元
  if (originalClaudeHome === undefined) {
    delete process.env.CLAUDE_HOME;
  } else {
    process.env.CLAUDE_HOME = originalClaudeHome;
  }
  setPlatform(originalPlatform);
});

beforeEach(() => {
  // 各テスト直前に env / platform を既定状態へリセット
  delete process.env.CLAUDE_HOME;
  setPlatform(originalPlatform);
});

afterEach(() => {
  delete process.env.CLAUDE_HOME;
  setPlatform(originalPlatform);
});

describe('getClaudeHome', () => {
  it('P1: macOS/Linux で ~/.claude を返す（既定 scope=user）', () => {
    // skip on Windows host: actual platform-specific path differs but logic is verified by P2
    if (process.platform === 'win32') {
      return;
    }

    const result = getClaudeHome();
    assert.equal(result, join(homedir(), '.claude'));
  });

  it('P2: Windows プラットフォームでも os.homedir() ベースで解決される', () => {
    setPlatform('win32');

    const result = getClaudeHome();
    // os.homedir() は OS が解決するため、実体パスはホスト環境に依存するが、
    // ロジック上は <homedir>/.claude となることを検証する
    assert.equal(result, join(homedir(), '.claude'));
  });

  it('P3: scope="project" のとき <cwd>/.claude を返す', () => {
    const fakeCwd = '/tmp/fake-project';
    const result = getClaudeHome({ scope: 'project', cwd: fakeCwd });
    assert.equal(result, join(fakeCwd, '.claude'));
  });

  it('P3b: scope="project" で cwd 未指定時は process.cwd() を使う', () => {
    const result = getClaudeHome({ scope: 'project' });
    assert.equal(result, join(process.cwd(), '.claude'));
  });

  it('P4: CLAUDE_HOME 環境変数が設定されているとき最優先で返す', () => {
    process.env.CLAUDE_HOME = '/custom/claude/home';

    const userScope = getClaudeHome({ scope: 'user' });
    const projectScope = getClaudeHome({ scope: 'project', cwd: '/foo' });

    assert.equal(userScope, '/custom/claude/home');
    assert.equal(projectScope, '/custom/claude/home');
  });

  it('P4b: 空文字の CLAUDE_HOME は無視して通常解決にフォールバック', () => {
    process.env.CLAUDE_HOME = '   ';

    const result = getClaudeHome();
    assert.equal(result, join(homedir(), '.claude'));
  });
});

describe('getSettingsPath / getHooksDir / getConfigPath', () => {
  it('P5: settings.json は <claudeHome>/settings.json', () => {
    const home = getClaudeHome();
    assert.equal(getSettingsPath(), join(home, 'settings.json'));
  });

  it('P5: hooks ディレクトリは <claudeHome>/hooks', () => {
    const home = getClaudeHome();
    assert.equal(getHooksDir(), join(home, 'hooks'));
  });

  it('P5: config.json は <claudeHome>/hooks/config.json', () => {
    const home = getClaudeHome();
    assert.equal(getConfigPath(), join(home, 'hooks', 'config.json'));
  });

  it('P5: scope="project" 指定が派生関数まで伝播する', () => {
    const fakeCwd = '/tmp/another-project';
    const opts = { scope: 'project' as const, cwd: fakeCwd };

    assert.equal(
      getSettingsPath(opts),
      join(fakeCwd, '.claude', 'settings.json'),
    );
    assert.equal(getHooksDir(opts), join(fakeCwd, '.claude', 'hooks'));
    assert.equal(
      getConfigPath(opts),
      join(fakeCwd, '.claude', 'hooks', 'config.json'),
    );
  });

  it('P5: CLAUDE_HOME override が派生関数まで伝播する', () => {
    process.env.CLAUDE_HOME = '/env/claude';

    assert.equal(getSettingsPath(), join('/env/claude', 'settings.json'));
    assert.equal(getHooksDir(), join('/env/claude', 'hooks'));
    assert.equal(
      getConfigPath(),
      join('/env/claude', 'hooks', 'config.json'),
    );
  });
});
