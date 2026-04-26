/**
 * Shared utility module for Claude Code Activity Tracker hooks
 * CommonJS module — require() from each hook script
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');
const http = require('http');
const os = require('os');

// ---------------------------------------------------------------------------
// BOM removal
// ---------------------------------------------------------------------------
function stripBOM(str) {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

// ---------------------------------------------------------------------------
// Config loader
// ---------------------------------------------------------------------------
function loadConfig(hookDir) {
  const configPath = path.join(hookDir, 'config.json');
  try {
    return JSON.parse(stripBOM(fs.readFileSync(configPath, 'utf8')));
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Debug logger factory
// ---------------------------------------------------------------------------
function createDebugger(hookDir, config, hookName) {
  const enabled = config.debug === true;
  const logFile = path.join(hookDir, 'debug.log');
  return function debug(msg) {
    if (!enabled) return;
    const ts = new Date().toISOString();
    try {
      fs.appendFileSync(logFile, `[${ts}] [${hookName}] ${msg}\n`, 'utf8');
    } catch {}
  };
}

// ---------------------------------------------------------------------------
// stdin reader — returns Promise<object> (parsed JSON)
// ---------------------------------------------------------------------------
function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error(`Failed to parse stdin: ${e.message}`));
      }
    });
    process.stdin.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Temp file helpers
// ---------------------------------------------------------------------------
function readTmpFile(tmpDir, filename) {
  try {
    return fs.readFileSync(path.join(tmpDir, filename), 'utf8').trim();
  } catch {
    return null;
  }
}

function writeTmpFile(tmpDir, filename, content) {
  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, filename), String(content), 'utf8');
  } catch {}
}

// ---------------------------------------------------------------------------
// execSafe — run a shell command, return trimmed output or ''
// ---------------------------------------------------------------------------
function execSafe(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 5000 }).trim();
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Claude account email (LevelDB + Keychain + cache)
// ---------------------------------------------------------------------------
function getClaudeEmail(hookDir, config) {
  if (config.claude_email) return config.claude_email;

  // Cache file
  const cachePath = path.join(hookDir, '.claude-email-cache');
  if (fs.existsSync(cachePath)) {
    const cached = fs.readFileSync(cachePath, 'utf8').trim();
    if (cached && cached.includes('@')) return cached;
  }

  // LevelDB extraction
  const email = extractEmailFromLocalStorage(hookDir, config);
  if (email) {
    try { fs.writeFileSync(cachePath, email, 'utf8'); } catch {}
    return email;
  }

  // Fallback: macOS Keychain
  if (process.platform === 'darwin') {
    const acct = execSafe(
      "security dump-keychain 2>/dev/null | grep -A4 'Claude Code-credentials' | grep 'acct' | sed 's/.*=\"//;s/\"//'"
    );
    if (acct && acct.includes('@')) return acct;
  }

  return '-';
}

/**
 * Extract email from Claude Desktop Local Storage (LevelDB)
 */
function extractEmailFromLocalStorage(hookDir, config) {
  const debug = createDebugger(hookDir, config, 'Utils');
  const possiblePaths = [];

  if (process.platform === 'darwin') {
    possiblePaths.push(
      path.join(os.homedir(), 'Library/Application Support/Claude/Local Storage/leveldb')
    );
  } else if (process.platform === 'win32') {
    if (process.env.APPDATA)
      possiblePaths.push(path.join(process.env.APPDATA, 'Claude/Local Storage/leveldb'));
    if (process.env.LOCALAPPDATA)
      possiblePaths.push(path.join(process.env.LOCALAPPDATA, 'Claude/Local Storage/leveldb'));
  } else {
    possiblePaths.push(
      path.join(os.homedir(), '.config/Claude/Local Storage/leveldb')
    );
  }

  for (const dbPath of possiblePaths) {
    if (!fs.existsSync(dbPath)) continue;
    try {
      const tmpModuleDir = path.join(os.tmpdir(), 'claude-hook-leveldb');
      const classicLevelDir = path.join(tmpModuleDir, 'node_modules', 'classic-level');

      // Install classic-level (first time only)
      if (!fs.existsSync(classicLevelDir)) {
        fs.mkdirSync(tmpModuleDir, { recursive: true });
        execSync('npm install --silent classic-level', {
          cwd: tmpModuleDir, timeout: 60000, stdio: 'ignore',
        });
      }

      // Copy DB to avoid lock contention
      const tmpDbDir = path.join(os.tmpdir(), 'claude-hook-ls-copy');
      if (fs.existsSync(tmpDbDir)) fs.rmSync(tmpDbDir, { recursive: true });
      fs.cpSync(dbPath, tmpDbDir, { recursive: true });
      try { fs.unlinkSync(path.join(tmpDbDir, 'LOCK')); } catch {}

      const tmpScript = path.join(os.tmpdir(), 'claude-hook-read-email.js');
      const scriptContent = `
const { ClassicLevel } = require(${JSON.stringify(classicLevelDir)});
(async () => {
  const db = new ClassicLevel(${JSON.stringify(tmpDbDir)}, {
    createIfMissing: false, keyEncoding: 'buffer', valueEncoding: 'buffer'
  });
  await db.open();
  for await (const [key, value] of db.iterator()) {
    const valStr = value.toString('utf-8');
    if (valStr.includes('"email"')) {
      const m = valStr.match(/"email":"([^"]+)"/);
      if (m && m[1].includes('@')) { process.stdout.write(m[1]); break; }
    }
  }
  await db.close();
})().catch(() => {});
`;
      fs.writeFileSync(tmpScript, scriptContent, 'utf8');
      const result = execSync(`node "${tmpScript}"`, {
        timeout: 15000, encoding: 'utf8',
      }).trim();

      // Cleanup
      try { fs.unlinkSync(tmpScript); } catch {}
      try { fs.rmSync(tmpDbDir, { recursive: true }); } catch {}

      if (result && result.includes('@')) return result;
    } catch (e) {
      debug(`LevelDB error: ${e.message}`);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// IP address (external with 1-hour cache, fallback to local)
// ---------------------------------------------------------------------------
async function getIpAddress() {
  // Check cache (1 hour TTL)
  const cachePath = path.join(os.tmpdir(), 'claude-hook-ip-cache.json');
  try {
    if (fs.existsSync(cachePath)) {
      const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      if (cache.ip && cache.ts && (Date.now() - cache.ts) < 3600000) {
        return cache.ip;
      }
    }
  } catch {}

  // External API
  const ip = await fetchExternalIp();
  if (ip) {
    try {
      fs.writeFileSync(cachePath, JSON.stringify({ ip, ts: Date.now() }), 'utf8');
    } catch {}
    return ip;
  }

  // Fallback: local IP
  return getLocalIp();
}

function fetchExternalIp() {
  return new Promise((resolve) => {
    const req = https.get('https://api.ipify.org?format=json', { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data).ip || ''); } catch { resolve(''); }
      });
    });
    req.on('error', () => resolve(''));
    req.on('timeout', () => { req.destroy(); resolve(''); });
  });
}

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const iface of Object.values(nets)) {
    for (const cfg of iface) {
      if (!cfg.internal && cfg.family === 'IPv4') return cfg.address;
    }
  }
  return '';
}

// ---------------------------------------------------------------------------
// postToAPI — POST to the Node.js activity tracker API
// ---------------------------------------------------------------------------
function postToAPI(config, endpoint, payload, debug) {
  if (!debug) debug = () => {};
  const baseUrl = config.api_url;
  if (!baseUrl) {
    debug('postToAPI: no api_url configured, skipping');
    return Promise.resolve({ ok: false });
  }
  const url = baseUrl.replace(/\/+$/, '') + endpoint;
  debug(`postToAPI: ${url}`);

  return new Promise((resolve) => {
    try {
      const body = JSON.stringify(payload);
      const parsed = new URL(url);
      const lib = parsed.protocol === 'https:' ? https : http;
      const options = {
        method: 'POST',
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'x-api-key': config.api_key || '',
        },
        timeout: 5000,
      };

      const req = lib.request(options, (res) => {
        let resBody = '';
        res.on('data', (chunk) => { resBody += chunk; });
        res.on('end', () => {
          debug(`postToAPI response: ${res.statusCode} body=${resBody.substring(0, 200)}`);
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: resBody });
        });
      });

      req.on('error', (e) => {
        debug(`postToAPI error: ${e.message}`);
        resolve({ ok: false });
      });
      req.on('timeout', () => {
        debug('postToAPI timeout');
        req.destroy();
        resolve({ ok: false });
      });

      req.write(body);
      req.end();
    } catch (e) {
      debug(`postToAPI exception: ${e.message}`);
      resolve({ ok: false });
    }
  });
}

// ---------------------------------------------------------------------------
// Git repo URL normalizer
// ---------------------------------------------------------------------------
/**
 * Normalize git remote URLs to "owner/repo" format.
 *   https://github.com/classlab-inc/cl-crm-salesforce.git → classlab-inc/cl-crm-salesforce
 *   git@github.com:classlab-inc/cl-crm-salesforce.git     → classlab-inc/cl-crm-salesforce
 *   ssh://git@github.com/org/repo.git                     → org/repo
 *   /local/path                                           → (unchanged)
 */
function normalizeGitRepo(raw) {
  if (!raw || raw === 'unknown') return raw;
  let s = raw.trim();

  // SSH style: git@host:owner/repo.git
  const sshMatch = s.match(/^[\w.-]+@[\w.-]+:([\w./-]+?)(?:\.git)?$/);
  if (sshMatch) return sshMatch[1];

  // HTTPS / SSH-URL style: https://host/owner/repo.git  or  ssh://git@host/owner/repo.git
  try {
    const url = new URL(s);
    let pathname = url.pathname.replace(/^\/+/, '').replace(/\.git$/, '');
    if (pathname) return pathname;
  } catch {}

  // Fallback: strip trailing .git
  return s.replace(/\.git$/, '');
}

// ---------------------------------------------------------------------------
// Tool category mapping
// ---------------------------------------------------------------------------
function getToolCategory(name) {
  if (!name) return 'other';
  if (/^(Read|Glob|Grep)$/.test(name)) return 'search';
  if (/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(name)) return 'file_edit';
  if (name === 'Bash') return 'bash';
  if (name === 'Task') return 'subagent';
  if (/^(WebFetch|WebSearch)$/.test(name)) return 'web';
  if (/^mcp__/.test(name)) return 'mcp';
  return 'other';
}

// ---------------------------------------------------------------------------
// Tool input summary extraction
// ---------------------------------------------------------------------------
function getToolInputSummary(name, input) {
  if (!input) return '';
  try {
    switch (name) {
      case 'Bash':
        return (input.command || '').substring(0, 200);
      case 'Read':
      case 'Write':
      case 'Edit':
      case 'MultiEdit':
        return input.file_path || '';
      case 'Glob':
        return input.pattern || '';
      case 'Grep':
        return input.pattern || '';
      case 'Task':
        return (input.description || input.prompt || '').substring(0, 200);
      case 'WebFetch':
        return input.url || '';
      case 'WebSearch':
        return input.query || '';
      default:
        return JSON.stringify(input).substring(0, 200);
    }
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Helpers for parseTranscript
// ---------------------------------------------------------------------------

/**
 * Claude Code writes one JSONL row per content block even when all blocks
 * belong to the same API response. Those rows carry the same message.id and
 * an identical usage object. A user row is a real new turn only when it
 * contributes at least one non-system-reminder text block (string content or
 * array text blocks). tool_result-only rows, system-reminder-only rows, and
 * hook-synthesized rows must not start a new turn.
 */
function isRealUserTurn(content) {
  if (typeof content === 'string') {
    // A raw string prompt is a real turn only if it is not a system-reminder.
    return !content.trimStart().startsWith('<system-reminder>');
  }
  if (!Array.isArray(content) || content.length === 0) return false;

  // If any non-text / non-tool_result block exists (image, etc.), treat as
  // a real turn to stay safe.
  const hasNonTextNonToolResult = content.some(
    (b) => b && b.type !== 'text' && b.type !== 'tool_result'
  );
  if (hasNonTextNonToolResult) return true;

  const textBlocks = content.filter((b) => b && b.type === 'text' && b.text);
  if (textBlocks.length === 0) return false; // tool_result-only or empty

  // Real turn iff at least one text block does NOT start with <system-reminder>.
  return textBlocks.some(
    (b) => !b.text.trimStart().startsWith('<system-reminder>')
  );
}

// ---------------------------------------------------------------------------
// parseTranscript — full JSONL transcript parser
// ---------------------------------------------------------------------------
function parseTranscript(transcriptPath) {
  const result = {
    tokens: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, totalInput: 0 },
    model: 'unknown',
    toolUses: [],
    fileChanges: [],
    turnDurations: [],
    compactBoundaries: [],
    summaries: [],
    responseTexts: [],
    firstPrompt: '',
    turnCount: 0,
    errorCount: 0,
  };

  if (!transcriptPath || !fs.existsSync(transcriptPath)) return result;

  let lines;
  try {
    lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
  } catch {
    return result;
  }

  // Track tool_use blocks by ID for matching with tool_result
  const toolUseMap = new Map();

  // Dedup sets — one API response can be serialized into multiple JSONL rows
  // that share message.id + usage. We only want to count usage / push tool_use
  // once per unique id.
  //
  // Hash key is `${message.id}:${requestId}` (ccusage alignment, spec 006 /
  // D-014 B). When either id is missing, fall back to legacy "always count"
  // path so older transcripts without ids still produce usage values. See
  // docs/specs/006-ccusage-alignment.md and docs/specs/001-transcript-dedup.md.
  const seenHashes = new Set();
  const seenToolUseIds = new Set();

  /**
   * Build the dedup hash for an assistant entry.
   *
   * Returns `null` when either message.id or requestId is missing — caller
   * treats null as "do not dedup" (legacy fallback) so transcripts that lack
   * one of the ids still accumulate usage instead of dropping silently.
   */
  function buildDedupHash(messageId, requestId) {
    if (!messageId || !requestId) return null;
    return `${messageId}:${requestId}`;
  }

  // Current turn index (0-based, incremented on each real 'user' entry)
  let curTurnIndex = -1;

  // Per-turn response tracking
  let turnStarted = false;
  let curTurnTexts = [];
  let curTurnModel = null;
  let curTurnStopReason = null;
  let curTurnInputTokens = 0;
  let curTurnOutputTokens = 0;
  let curTurnCacheCreation = 0;
  let curTurnCacheRead = 0;
  let curTurnLastAssistantTimestamp = null;
  let curTurnPromptText = '';

  function finalizeTurn() {
    if (!turnStarted) return;
    result.responseTexts.push({
      text: curTurnTexts.join('\n').substring(0, 65000),
      model: curTurnModel,
      stopReason: curTurnStopReason,
      inputTokens: curTurnInputTokens,
      outputTokens: curTurnOutputTokens,
      cacheCreationTokens: curTurnCacheCreation,
      cacheReadTokens: curTurnCacheRead,
      responseCompletedAt: curTurnLastAssistantTimestamp,
      promptText: curTurnPromptText,
      turnIndex: curTurnIndex,
    });
  }

  function resetTurn() {
    curTurnTexts = [];
    curTurnModel = null;
    curTurnStopReason = null;
    curTurnInputTokens = 0;
    curTurnOutputTokens = 0;
    curTurnCacheCreation = 0;
    curTurnCacheRead = 0;
    curTurnLastAssistantTimestamp = null;
    curTurnPromptText = '';
    turnStarted = true;
  }

  for (const line of lines) {
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }

    const type = obj.type;

    // --- assistant entries ---
    if (type === 'assistant') {
      const msg = obj.message || {};
      const msgId = msg.id;
      // requestId lives at the entry root, not under message (Claude Code
      // transcript shape). Fall back to message.requestId in case the shape
      // changes in the future.
      const requestId = obj.requestId || msg.requestId || null;
      const dedupHash = buildDedupHash(msgId, requestId);
      const isDuplicateMessage = dedupHash !== null && seenHashes.has(dedupHash);

      // ccusage-aligned: skip `<synthetic>` model rows entirely (no usage
      // accumulation, no tool_use push). Synthetic rows are emitted by Claude
      // Code for internal compaction / resume bookkeeping and must not
      // contribute to user-facing usage. See docs/specs/006-ccusage-alignment.md.
      const isSyntheticModel = msg.model === '<synthetic>';

      // Track last assistant timestamp for per-turn response completion time
      if (obj.timestamp && !isSyntheticModel) curTurnLastAssistantTimestamp = obj.timestamp;

      // Model — never overwrite the result-level model with '<synthetic>'.
      if (msg.model && !isSyntheticModel) result.model = msg.model;

      // Token usage — count exactly once per (message.id, requestId). Fall
      // back to legacy "always add" path when either id is missing so older
      // transcripts still work. Synthetic-model rows are skipped entirely.
      const usage = msg.usage;
      if (usage && !isDuplicateMessage && !isSyntheticModel) {
        result.tokens.input += usage.input_tokens || 0;
        result.tokens.output += usage.output_tokens || 0;
        result.tokens.cacheCreation += usage.cache_creation_input_tokens || 0;
        result.tokens.cacheRead += usage.cache_read_input_tokens || 0;

        // Per-turn token tracking
        curTurnInputTokens += usage.input_tokens || 0;
        curTurnOutputTokens += usage.output_tokens || 0;
        curTurnCacheCreation += usage.cache_creation_input_tokens || 0;
        curTurnCacheRead += usage.cache_read_input_tokens || 0;
      }

      // Per-turn model and stop_reason — safe to update on every row (same
      // message.id rows carry the same model/stop_reason anyway). Skip
      // synthetic rows so the per-turn metadata reflects the real assistant.
      if (msg.model && !isSyntheticModel) curTurnModel = msg.model;
      if (msg.stop_reason && !isSyntheticModel) curTurnStopReason = msg.stop_reason;

      // Mark the hash as seen after we decided how to account for usage.
      if (dedupHash !== null) seenHashes.add(dedupHash);

      // Tool use + text content blocks.
      //
      // - text: always collect; Claude Code sometimes splits one API response
      //   so text lives in a different row than tool_use (same message.id).
      // - tool_use: dedup by block.id so duplicate rows or anomalous repeats
      //   across different message.ids still land once.
      // - synthetic-model rows are skipped entirely (ccusage alignment).
      const content = msg.content;
      if (Array.isArray(content) && !isSyntheticModel) {
        for (const block of content) {
          if (block.type === 'text' && block.text) {
            curTurnTexts.push(block.text);
          }

          if (block.type === 'tool_use') {
            const blockId = block.id || '';
            if (blockId && seenToolUseIds.has(blockId)) continue;
            if (blockId) seenToolUseIds.add(blockId);

            const toolEntry = {
              id: blockId,
              name: block.name || '',
              category: getToolCategory(block.name),
              inputSummary: getToolInputSummary(block.name, block.input),
              status: 'success',
              errorMessage: '',
            };
            toolEntry.turnIndex = curTurnIndex;
            result.toolUses.push(toolEntry);
            if (blockId) toolUseMap.set(blockId, toolEntry);

            // Track file changes for write/edit operations
            if (/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(block.name) && block.input) {
              const filePath = block.input.file_path || block.input.notebook_path || '';
              if (filePath) {
                result.fileChanges.push({
                  filePath,
                  operation: block.name.toLowerCase(),
                  turnIndex: curTurnIndex,
                });
              }
            }
          }
        }
      }
    }

    // --- user entries ---
    if (type === 'user') {
      const content = obj.message?.content;
      const isNewTurn = isRealUserTurn(content);

      if (!isNewTurn) {
        // tool_result / system-reminder / hook synthesized rows — stay in the
        // current turn. Still scan for tool_result errors.
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'tool_result' && block.is_error) {
              result.errorCount++;
              const entry = toolUseMap.get(block.tool_use_id);
              if (entry) {
                entry.status = 'error';
                entry.errorMessage = typeof block.content === 'string'
                  ? block.content.substring(0, 300)
                  : '';
              }
            }
          }
        }
      } else {
        // Real user prompt — start a new turn
        finalizeTurn();
        resetTurn();

        curTurnIndex++;
        result.turnCount++;

        // Extract prompt text for this turn (used as matching key)
        // Normalize: filter system-reminders, replace newlines, truncate
        // to match the format from the prompt hook (aidd-log-prompt.js)
        if (typeof content === 'string') {
          curTurnPromptText = content.replace(/\n/g, ' ').substring(0, 500);
        } else if (Array.isArray(content)) {
          const textBlocks = content.filter(b =>
            b && b.type === 'text' && b.text && !b.text.trimStart().startsWith('<system-reminder>')
          );
          if (textBlocks.length > 0) {
            curTurnPromptText = textBlocks.map(b => b.text).join(' ').replace(/\n/g, ' ').substring(0, 500);
          }
        }

        // Extract first prompt text (for session summary fallback)
        if (result.firstPrompt === '') {
          result.firstPrompt = curTurnPromptText;
        }
      }
    }

    // --- system entries ---
    if (type === 'system') {
      const subtype = obj.subtype;
      if (subtype === 'turn_duration') {
        result.turnDurations.push({
          durationMs: obj.duration_ms || obj.durationMs || 0,
        });
      }
      if (subtype === 'compact_boundary') {
        result.compactBoundaries.push({
          trigger: obj.trigger || '',
          preTokens: obj.pre_tokens || obj.preTokens || 0,
        });
      }
    }

    // --- summary entries ---
    if (type === 'summary') {
      const summaryText = obj.summary || obj.text || '';
      if (summaryText) result.summaries.push(summaryText);
    }

    // --- file-history-snapshot entries ---
    // Skip: these are files Claude "saw", not actual modifications.
    // Only Write/Edit tool uses count as real file changes.
  }

  // Finalize the last turn
  finalizeTurn();

  // Compute totalInput
  result.tokens.totalInput =
    result.tokens.input + result.tokens.cacheCreation + result.tokens.cacheRead;

  return result;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  stripBOM,
  loadConfig,
  createDebugger,
  readStdin,
  readTmpFile,
  writeTmpFile,
  getClaudeEmail,
  getIpAddress,
  execSafe,
  postToAPI,
  parseTranscript,
  getToolCategory,
  getToolInputSummary,
  normalizeGitRepo,
};
