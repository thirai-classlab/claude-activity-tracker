#!/usr/bin/env node
/**
 * SubagentStart hook: Record subagent (Task) spawn to API
 */
const {
  loadConfig, createDebugger, readStdin, postToAPI,
} = require('./shared/utils');

const hookDir = __dirname;
const config = loadConfig(hookDir);
const debug = createDebugger(hookDir, config, 'SubagentStart');

(async () => {
  debug('--- Hook started ---');
  const input = await readStdin();
  debug(`stdin: ${JSON.stringify(input).substring(0, 200)}`);

  const sessionId = input.session_id;
  if (!sessionId) { debug('No session_id, skipping'); return; }

  const payload = {
    session_uuid: sessionId,
    agent_uuid: input.agent_id || '',
    agent_type: input.agent_type || '',
    started_at: new Date().toISOString(),
  };

  debug(`payload: ${JSON.stringify(payload)}`);
  await postToAPI(config, '/api/hook/subagent-start', payload, debug);
  debug('--- Hook completed OK ---');
})().catch((e) => {
  try { createDebugger(hookDir, config, 'SubagentStart')(`FATAL: ${e.message}\n${e.stack}`); } catch {}
  process.exit(0);
});
