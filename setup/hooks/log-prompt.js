#!/usr/bin/env node
/**
 * UserPromptSubmit hook: Record prompt to API and save to tmp
 */
const path = require('path');
const os = require('os');
const {
  loadConfig, createDebugger, readStdin, writeTmpFile, postToAPI,
} = require('./shared/utils');

const hookDir = __dirname;
const config = loadConfig(hookDir);
const debug = createDebugger(hookDir, config, 'PromptSubmit');

(async () => {
  debug('--- Hook started ---');
  const input = await readStdin();
  debug(`stdin: ${JSON.stringify(input).substring(0, 200)}`);

  const sessionId = input.session_id;
  const prompt = input.prompt || '';
  if (!sessionId) { debug('No session_id, skipping'); return; }

  // Backward compat: save prompt + start time to tmpDir
  const tmpDir = path.join(os.tmpdir(), `claude-hooks-${sessionId}`);
  writeTmpFile(tmpDir, 'last_prompt.txt', prompt);
  writeTmpFile(tmpDir, 'prompt_start_time.txt', Date.now().toString());

  // Truncate prompt for API
  let promptText = prompt.replace(/\n/g, ' ').substring(0, 500);
  if (prompt.length > 500) promptText += '...';

  const payload = {
    session_uuid: sessionId,
    prompt_text: promptText,
    submitted_at: new Date().toISOString(),
  };

  debug(`payload: ${JSON.stringify(payload).substring(0, 300)}`);
  await postToAPI(config, '/api/hook/prompt', payload, debug);
  debug('--- Hook completed OK ---');
})().catch((e) => {
  try { createDebugger(hookDir, config, 'PromptSubmit')(`FATAL: ${e.message}\n${e.stack}`); } catch {}
  process.exit(0);
});
