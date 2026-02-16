#!/usr/bin/env node
/**
 * Stop hook: Parse main transcript and record full session data to API
 */
const path = require('path');
const os = require('os');
const {
  loadConfig, createDebugger, readStdin, readTmpFile,
  getClaudeEmail, getIpAddress, execSafe,
  parseTranscript, postToAPI, normalizeGitRepo,
} = require('./shared/utils');

const hookDir = __dirname;
const config = loadConfig(hookDir);
const debug = createDebugger(hookDir, config, 'Stop');

(async () => {
  debug('--- Hook started ---');
  const input = await readStdin();
  debug(`stdin: ${JSON.stringify(input).substring(0, 200)}`);

  const sessionId = input.session_id;
  if (!sessionId) { debug('No session_id, skipping'); return; }

  const transcriptPath = input.transcript_path || '';
  const cwd = input.cwd || '';
  const tmpDir = path.join(os.tmpdir(), `claude-hooks-${sessionId}`);

  // Parse transcript
  debug(`Parsing transcript: ${transcriptPath}`);
  const parsed = parseTranscript(transcriptPath);
  debug(`Parsed: model=${parsed.model}, turns=${parsed.turnCount}, tools=${parsed.toolUses.length}, errors=${parsed.errorCount}`);

  // Model fallback from tmpDir
  const model = parsed.model !== 'unknown'
    ? parsed.model
    : (readTmpFile(tmpDir, 'model.txt') || 'unknown');

  // Git info
  const gitRepo = normalizeGitRepo(execSafe('git remote get-url origin')) || 'unknown';
  const gitBranch = execSafe('git branch --show-current') || 'unknown';
  const gitUser = execSafe('git config user.email') || 'unknown';

  // Claude account + IP (from cache or fresh)
  const claudeAccount = getClaudeEmail(hookDir, config);
  const ipAddress = await getIpAddress();

  // Summary text: summaries > firstPrompt
  let summary = parsed.summaries.join('\n').substring(0, 1000);
  if (!summary) {
    summary = (parsed.firstPrompt || '').replace(/\n/g, ' ').substring(0, 500);
  }

  // Session events from turn durations
  const sessionEvents = parsed.turnDurations.map((td, i) => ({
    event_type: 'turn_duration',
    event_subtype: null,
    event_data: { turn_index: i, duration_ms: td.durationMs },
  }));
  // Add compact events
  parsed.compactBoundaries.forEach((cb, i) => {
    sessionEvents.push({
      event_type: 'compact',
      event_subtype: null,
      event_data: { boundary_index: i, ...cb },
    });
  });

  const payload = {
    session_uuid: sessionId,
    stopped_at: new Date().toISOString(),
    claude_account: claudeAccount,
    git_user: gitUser,
    git_repo: gitRepo,
    git_branch: gitBranch,
    ip_address: ipAddress,
    model,
    total_input_tokens: parsed.tokens.input,
    total_output_tokens: parsed.tokens.output,
    total_cache_creation_tokens: parsed.tokens.cacheCreation,
    total_cache_read_tokens: parsed.tokens.cacheRead,
    turn_count: parsed.turnCount,
    tool_use_count: parsed.toolUses.length,
    compact_count: parsed.compactBoundaries.length,
    error_count: parsed.errorCount,
    summary,
    tool_uses: parsed.toolUses.map((t) => ({
      tool_use_uuid: t.id || '',
      tool_name: t.name,
      tool_category: t.category,
      tool_input_summary: t.inputSummary,
      status: t.status,
      error_message: t.errorMessage,
      turn_index: t.turnIndex ?? null,
    })),
    file_changes: parsed.fileChanges.map((fc) => ({
      file_path: fc.filePath,
      operation: fc.operation,
      turn_index: fc.turnIndex ?? null,
    })),
    session_events: sessionEvents,
    turn_durations: parsed.turnDurations.map((td) => ({
      durationMs: td.durationMs,
    })),
    response_texts: parsed.responseTexts.map((rt) => ({
      text: rt.text,
      model: rt.model,
      stopReason: rt.stopReason,
      inputTokens: rt.inputTokens,
      outputTokens: rt.outputTokens,
      cacheCreationTokens: rt.cacheCreationTokens,
      cacheReadTokens: rt.cacheReadTokens,
      responseCompletedAt: rt.responseCompletedAt || null,
    })),
  };

  debug(`payload keys: ${Object.keys(payload).join(', ')}`);
  debug(`tool_uses count: ${payload.tool_uses.length}, file_changes count: ${payload.file_changes.length}`);
  await postToAPI(config, '/api/hook/stop', payload, debug);

  debug('--- Hook completed OK ---');
})().catch((e) => {
  try { createDebugger(hookDir, config, 'Stop')(`FATAL: ${e.message}\n${e.stack}`); } catch {}
  process.exit(0);
});
