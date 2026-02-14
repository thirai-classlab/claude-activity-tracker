#!/usr/bin/env node
/**
 * SessionEnd hook: Record session end reason to API
 */
const {
  loadConfig, createDebugger, readStdin, postToAPI,
} = require('./shared/utils');

const hookDir = __dirname;
const config = loadConfig(hookDir);
const debug = createDebugger(hookDir, config, 'SessionEnd');

(async () => {
  debug('--- Hook started ---');
  const input = await readStdin();
  debug(`stdin: ${JSON.stringify(input).substring(0, 200)}`);

  const sessionId = input.session_id;
  if (!sessionId) { debug('No session_id, skipping'); return; }

  const payload = {
    session_uuid: sessionId,
    reason: input.reason || '',
    ended_at: new Date().toISOString(),
  };

  debug(`payload: ${JSON.stringify(payload)}`);
  await postToAPI(config, '/api/hook/session-end', payload, debug);
  debug('--- Hook completed OK ---');
})().catch((e) => {
  try { createDebugger(hookDir, config, 'SessionEnd')(`FATAL: ${e.message}\n${e.stack}`); } catch {}
  process.exit(0);
});
