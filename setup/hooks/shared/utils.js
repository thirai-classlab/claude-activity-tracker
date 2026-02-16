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

  // Current turn index (0-based, incremented on each 'user' entry)
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
    turnStarted = true;
  }

  for (const line of lines) {
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }

    const type = obj.type;

    // --- assistant entries ---
    if (type === 'assistant') {
      const msg = obj.message || {};

      // Model
      if (msg.model) result.model = msg.model;

      // Token usage
      const usage = msg.usage;
      if (usage) {
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

      // Per-turn model and stop_reason
      if (msg.model) curTurnModel = msg.model;
      if (msg.stop_reason) curTurnStopReason = msg.stop_reason;

      // Tool use content blocks + text blocks
      const content = msg.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'text' && block.text) {
            curTurnTexts.push(block.text);
          }

          if (block.type === 'tool_use') {
            const toolEntry = {
              id: block.id || '',
              name: block.name || '',
              category: getToolCategory(block.name),
              inputSummary: getToolInputSummary(block.name, block.input),
              status: 'success',
              errorMessage: '',
            };
            toolEntry.turnIndex = curTurnIndex;
            result.toolUses.push(toolEntry);
            if (block.id) toolUseMap.set(block.id, toolEntry);

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

      // Determine if this is a tool_result-only message (not a real user prompt)
      const isToolResultOnly = Array.isArray(content) &&
        content.length > 0 &&
        content.every(block => block.type === 'tool_result');

      if (isToolResultOnly) {
        // tool_result messages are part of the same turn — don't split
        // Just check for errors
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
      } else {
        // Real user prompt — start a new turn
        finalizeTurn();
        resetTurn();

        curTurnIndex++;
        result.turnCount++;

        // Extract first prompt text (for subagent task name)
        if (result.firstPrompt === '') {
          if (typeof content === 'string') {
            result.firstPrompt = content.substring(0, 500);
          } else if (Array.isArray(content)) {
            const textBlocks = content.filter(b => b.type === 'text');
            if (textBlocks.length > 0) {
              result.firstPrompt = textBlocks.map(b => b.text).join('\n').substring(0, 500);
            }
          }
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
    if (type === 'file-history-snapshot') {
      const files = obj.files || obj.file_paths || [];
      if (Array.isArray(files)) {
        for (const fp of files) {
          const filePath = typeof fp === 'string' ? fp : (fp.path || '');
          if (filePath && !result.fileChanges.some((fc) => fc.filePath === filePath)) {
            result.fileChanges.push({ filePath, operation: 'snapshot' });
          }
        }
      }
    }
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
