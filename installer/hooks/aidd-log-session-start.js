#!/usr/bin/env node
/**
 * SessionStart hook: Record session start to API and save model info to tmp
 */
const path = require('path');
const os = require('os');
const {
  loadConfig, createDebugger, readStdin, writeTmpFile,
  getClaudeEmail, getIpAddress, execSafe, postToAPI,
  normalizeGitRepo,
} = require('./shared/utils');

const hookDir = __dirname;
const config = loadConfig(hookDir);
const debug = createDebugger(hookDir, config, 'SessionStart');

(async () => {
  debug('--- Hook started ---');
  const input = await readStdin();
  debug(`stdin: ${JSON.stringify(input).substring(0, 200)}`);

  const sessionId = input.session_id;
  if (!sessionId) { debug('No session_id, skipping'); return; }

  const model = input.model || 'unknown';
  const source = input.source || '';
  const permissionMode = input.permission_mode || '';
  const cwd = input.cwd || '';

  // Backward compat: save model + session_id to tmpDir
  const tmpDir = path.join(os.tmpdir(), `claude-hooks-${sessionId}`);
  writeTmpFile(tmpDir, 'model.txt', model);
  writeTmpFile(tmpDir, 'session_id.txt', sessionId);
  debug(`Wrote tmp files to ${tmpDir}`);

  // Gather git info
  const gitRepo = normalizeGitRepo(execSafe('git remote get-url origin')) || 'unknown';
  const gitBranch = execSafe('git branch --show-current') || 'unknown';
  const gitUser = execSafe('git config user.email') || 'unknown';

  // Claude account + IP
  const claudeAccount = getClaudeEmail(hookDir, config);
  const ipAddress = await getIpAddress();

  const payload = {
    session_uuid: sessionId,
    model,
    source,
    permission_mode: permissionMode,
    cwd,
    git_repo: gitRepo,
    git_branch: gitBranch,
    git_user: gitUser,
    claude_account: claudeAccount,
    ip_address: ipAddress,
    started_at: new Date().toISOString(),
  };

  debug(`payload: ${JSON.stringify(payload).substring(0, 300)}`);
  await postToAPI(config, '/api/hook/session-start', payload, debug);

  debug('--- Hook completed OK ---');
})().catch((e) => {
  try { createDebugger(hookDir, config, 'SessionStart')(`FATAL: ${e.message}\n${e.stack}`); } catch {}
  process.exit(0);
});
