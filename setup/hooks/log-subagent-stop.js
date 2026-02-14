#!/usr/bin/env node
/**
 * SubagentStop hook: Parse subagent transcript and record results to API
 */
const {
  loadConfig, createDebugger, readStdin, parseTranscript, postToAPI,
} = require('./shared/utils');

const hookDir = __dirname;
const config = loadConfig(hookDir);
const debug = createDebugger(hookDir, config, 'SubagentStop');

(async () => {
  debug('--- Hook started ---');
  const input = await readStdin();
  debug(`stdin: ${JSON.stringify(input).substring(0, 200)}`);

  const sessionId = input.session_id;
  if (!sessionId) { debug('No session_id, skipping'); return; }

  // Parse the subagent transcript
  const agentTranscriptPath = input.agent_transcript_path || '';
  debug(`Parsing subagent transcript: ${agentTranscriptPath}`);
  const parsed = parseTranscript(agentTranscriptPath);
  debug(`Parsed: model=${parsed.model}, tools=${parsed.toolUses.length}, tokens_in=${parsed.tokens.input}, tokens_out=${parsed.tokens.output}`);

  const payload = {
    session_uuid: sessionId,
    agent_uuid: input.agent_id || '',
    agent_type: input.agent_type || '',
    stopped_at: new Date().toISOString(),
    input_tokens: parsed.tokens.input,
    output_tokens: parsed.tokens.output,
    cache_creation_tokens: parsed.tokens.cacheCreation,
    cache_read_tokens: parsed.tokens.cacheRead,
    tool_uses: parsed.toolUses.map((t) => ({
      tool_use_uuid: t.id || '',
      tool_name: t.name,
      tool_category: t.category,
      tool_input_summary: t.inputSummary,
      status: t.status,
      error_message: t.errorMessage,
    })),
    agent_model: parsed.model,
  };

  debug(`payload keys: ${Object.keys(payload).join(', ')}`);
  await postToAPI(config, '/api/hook/subagent-stop', payload, debug);
  debug('--- Hook completed OK ---');
})().catch((e) => {
  try { createDebugger(hookDir, config, 'SubagentStop')(`FATAL: ${e.message}\n${e.stack}`); } catch {}
  process.exit(0);
});
