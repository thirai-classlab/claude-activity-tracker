# ============================================================
# Claude Code Activity Tracker - Windows Setup Script
# ============================================================
# Usage: powershell -ExecutionPolicy Bypass -File install-win.ps1
# ============================================================

$ErrorActionPreference = "Stop"

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$ClaudeDir = Join-Path $env:USERPROFILE ".claude"
$HooksDir = Join-Path $ClaudeDir "hooks"
$SettingsFile = Join-Path $ClaudeDir "settings.json"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$HooksSrc = Join-Path $ScriptDir "hooks"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Claude Code Activity Tracker Installer" -ForegroundColor Cyan
Write-Host " for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Prerequisites Check ---
Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Yellow

$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Host "  ERROR: Node.js is not installed" -ForegroundColor Red
    Write-Host "  Please install from https://nodejs.org/"
    exit 1
}

$nodeVer = & node -v
Write-Host "  Node.js: $nodeVer"

$gitPath = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitPath) {
    Write-Host "  WARNING: git not found" -ForegroundColor DarkYellow
}

Write-Host "  OK" -ForegroundColor Green
Write-Host ""

# --- 2. API Connection Settings ---
Write-Host "[2/6] Configuring API connection..." -ForegroundColor Yellow
$configPath = Join-Path $HooksDir "config.json"

# Read existing config.json
$ExistingApiUrl = ""
$ExistingApiKey = ""
$ExistingDebug = ""
if (Test-Path $configPath) {
    try {
        $existingConfig = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $ExistingApiUrl = $existingConfig.api_url
        $ExistingApiKey = $existingConfig.api_key
        if ($existingConfig.debug -eq $true) { $ExistingDebug = "true" } else { $ExistingDebug = "false" }
    } catch {}
}

# Read default config.json from distribution source
$DefaultSrcUrl = ""
$DefaultSrcKey = ""
$defaultConfigPath = Join-Path $HooksSrc "config.json"
if (Test-Path $defaultConfigPath) {
    try {
        $defaultConfig = Get-Content $defaultConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $DefaultSrcUrl = $defaultConfig.api_url
        $DefaultSrcKey = $defaultConfig.api_key
    } catch {}
}

# API URL (existing > default > localhost priority)
$DefaultApiUrl = if ($ExistingApiUrl) { $ExistingApiUrl } elseif ($DefaultSrcUrl) { $DefaultSrcUrl } else { "http://localhost:3001" }
$ApiUrl = Read-Host "  API URL [$DefaultApiUrl]"
if ([string]::IsNullOrWhiteSpace($ApiUrl)) {
    $ApiUrl = $DefaultApiUrl
}

# API Key (skip if existing or default available)
if ($ExistingApiKey) {
    $ApiKey = $ExistingApiKey
    Write-Host "  API Key: (using existing)"
} elseif ($DefaultSrcKey) {
    $ApiKey = $DefaultSrcKey
    Write-Host "  API Key: (using default)"
} else {
    Write-Host "  API Key (enter the key shared by your admin)"
    $ApiKey = Read-Host "  API Key"
    if ([string]::IsNullOrWhiteSpace($ApiKey)) {
        $ApiKey = ""
        Write-Host "  WARNING: API Key is empty. Data will be rejected if server auth is enabled." -ForegroundColor DarkYellow
    }
}

# Debug mode
$DefaultDebug = if ($ExistingDebug) { $ExistingDebug } else { "false" }
if ($DefaultDebug -eq "true") { $DebugDefault = "Y" } else { $DebugDefault = "N" }
$DebugInput = Read-Host "  Debug mode (y/N) [$DebugDefault]"
if ([string]::IsNullOrWhiteSpace($DebugInput)) {
    $DebugFlag = ($DefaultDebug -eq "true")
} elseif ($DebugInput -eq "y" -or $DebugInput -eq "Y") {
    $DebugFlag = $true
} else {
    $DebugFlag = $false
}

Write-Host ""
Write-Host "  Configuration:" -ForegroundColor White
Write-Host "    API URL:  $ApiUrl"
if ($ApiKey) { Write-Host "    API Key:  (set)" } else { Write-Host "    API Key:  (not set)" -ForegroundColor DarkYellow }
Write-Host "    Debug:    $DebugFlag"
Write-Host ""

# --- 3. Directory Creation & Hook File Copy ---
Write-Host "[3/6] Installing hook files..." -ForegroundColor Yellow

if (-not (Test-Path $HooksDir)) {
    New-Item -ItemType Directory -Path $HooksDir -Force | Out-Null
}

# shared/ subdirectory
$SharedDir = Join-Path $HooksDir "shared"
if (-not (Test-Path $SharedDir)) {
    New-Item -ItemType Directory -Path $SharedDir -Force | Out-Null
}

# Copy 6 hook files
foreach ($file in @("aidd-log-session-start.js", "aidd-log-prompt.js", "aidd-log-subagent-start.js", "aidd-log-subagent-stop.js", "aidd-log-stop.js", "aidd-log-session-end.js")) {
    $src = Join-Path $HooksSrc $file
    if (Test-Path $src) {
        Copy-Item $src -Destination (Join-Path $HooksDir $file) -Force
        Write-Host "  Copy: $file"
    } else {
        Write-Host "  ERROR: $src not found" -ForegroundColor Red
        exit 1
    }
}

# Copy shared/utils.js
$sharedSrc = Join-Path (Join-Path $HooksSrc "shared") "utils.js"
if (Test-Path $sharedSrc) {
    Copy-Item $sharedSrc -Destination (Join-Path $SharedDir "utils.js") -Force
    Write-Host "  Copy: shared/utils.js"
} else {
    Write-Host "  ERROR: $sharedSrc not found" -ForegroundColor Red
    exit 1
}

# Copy package.json
$pkgSrc = Join-Path $HooksSrc "package.json"
if (Test-Path $pkgSrc) {
    Copy-Item $pkgSrc -Destination (Join-Path $HooksDir "package.json") -Force
    Write-Host "  Copy: package.json"
} else {
    Write-Host "  ERROR: $pkgSrc not found" -ForegroundColor Red
    exit 1
}

# config.json (write as BOM-less UTF-8)
$debugStr = if ($DebugFlag) { "true" } else { "false" }
$configJson = @"
{
  "api_url": "$ApiUrl",
  "api_key": "$ApiKey",
  "debug": $debugStr
}
"@
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($configPath, $configJson, $utf8NoBom)
Write-Host "  Create: config.json"
Write-Host ""

# --- 4. npm dependency pre-install ---
Write-Host "[4/6] Pre-installing npm packages..." -ForegroundColor Yellow

$TmpDir = & node -e "console.log(require('os').tmpdir())"
$LevelDbDir = Join-Path $TmpDir "claude-hook-leveldb"
$ClassicLevelDir = Join-Path (Join-Path $LevelDbDir "node_modules") "classic-level"

if (-not (Test-Path $ClassicLevelDir)) {
    if (-not (Test-Path $LevelDbDir)) {
        New-Item -ItemType Directory -Path $LevelDbDir -Force | Out-Null
    }
    try {
        Push-Location $LevelDbDir
        & npm install --silent classic-level 2>&1 | Out-Null
        Pop-Location
        Write-Host "  Installed: classic-level"
    } catch {
        Pop-Location
        Write-Host "  WARNING: classic-level installation failed (affects email cache)" -ForegroundColor DarkYellow
    }
} else {
    Write-Host "  Already installed: classic-level"
}
Write-Host ""

# --- 5. Update global settings.json ---
Write-Host "[5/6] Updating Claude Code global settings..." -ForegroundColor Yellow

$SettingsFileJs = $SettingsFile -replace '\\', '/'
$HooksAbsPathJs = $HooksDir -replace '\\', '/'

# Here-string template (PowerShell does not interpret anything inside single-quoted here-strings)
$jsTemplate = @'
const fs = require("fs");
const settingsPath = "__SETTINGS_PATH__";
const hooksDir = "__HOOKS_DIR__";

let settings = {};
if (fs.existsSync(settingsPath)) {
    try { settings = JSON.parse(fs.readFileSync(settingsPath, "utf8")); } catch {}
}

if (!settings.hooks) settings.hooks = {};

const trackerHooks = {
    SessionStart:      { command: "node \"__HOOKS_DIR__/aidd-log-session-start.js\"", timeout: 15 },
    UserPromptSubmit:  { command: "node \"__HOOKS_DIR__/aidd-log-prompt.js\"", timeout: 10 },
    SubagentStart:     { command: "node \"__HOOKS_DIR__/aidd-log-subagent-start.js\"", timeout: 10 },
    SubagentStop:      { command: "node \"__HOOKS_DIR__/aidd-log-subagent-stop.js\"", timeout: 15 },
    Stop:              { command: "node \"__HOOKS_DIR__/aidd-log-stop.js\"", timeout: 30 },
    SessionEnd:        { command: "node \"__HOOKS_DIR__/aidd-log-session-end.js\"", timeout: 10 },
};

for (const [event, def] of Object.entries(trackerHooks)) {
    if (!settings.hooks[event]) settings.hooks[event] = [];

    for (const group of settings.hooks[event]) {
        if (group.hooks) {
            group.hooks = group.hooks.filter(h => !h.command || !h.command.includes("/hooks/aidd-log-"));
        }
    }
    settings.hooks[event] = settings.hooks[event].filter(g => g.hooks && g.hooks.length > 0);

    settings.hooks[event].push({
        matcher: "",
        hooks: [{ type: "command", command: def.command, timeout: def.timeout }]
    });
}

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
console.log("  Updated: " + settingsPath);
'@

$jsContent = $jsTemplate.Replace('__SETTINGS_PATH__', $SettingsFileJs).Replace('__HOOKS_DIR__', $HooksAbsPathJs)

# Write as BOM-less UTF-8 (PowerShell 5.x's -Encoding UTF8 adds BOM)
$tmpScript = Join-Path $TmpDir "claude-setup-settings.js"
[System.IO.File]::WriteAllText($tmpScript, $jsContent, $utf8NoBom)
& node $tmpScript
Remove-Item $tmpScript -ErrorAction SilentlyContinue
Write-Host ""

# --- 6. Health Check ---
Write-Host "[6/6] API server health check..." -ForegroundColor Yellow

try {
    $healthUrl = "$ApiUrl/health"
    $healthResult = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 5
    Write-Host "  API server response: OK" -ForegroundColor Green
    Write-Host "  Response: $($healthResult | ConvertTo-Json -Compress)"
} catch {
    Write-Host "  WARNING: Cannot connect to API server ($healthUrl)" -ForegroundColor DarkYellow
    Write-Host "  Please ensure the server is running"
}
Write-Host ""

# --- Verification ---
Write-Host "Verifying installation..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Hook files:" -ForegroundColor White
Get-ChildItem -Path $HooksDir -Filter "*.js" | ForEach-Object { Write-Host "    $($_.Name)" }
if (Test-Path (Join-Path $HooksDir "shared")) {
    Get-ChildItem -Path (Join-Path $HooksDir "shared") -Filter "*.js" | ForEach-Object { Write-Host "    shared/$($_.Name)" }
}
Get-ChildItem -Path $HooksDir -Filter "package.json" | ForEach-Object { Write-Host "    $($_.Name)" }
Get-ChildItem -Path $HooksDir -Filter "config.json" | ForEach-Object { Write-Host "    $($_.Name)" }
Write-Host ""
Write-Host "  Settings file:" -ForegroundColor White
Write-Host "    $SettingsFile"
Write-Host ""

# Hook tests
Write-Host "  Running tests..."
try {
    '{"session_id":"install-test","prompt":"test","model":"test"}' | & node (Join-Path $HooksDir "aidd-log-session-start.js") 2>&1 | Out-Null
    Write-Host "    SessionStart hook: OK" -ForegroundColor Green
} catch {
    Write-Host "    SessionStart hook: FAILED" -ForegroundColor Red
}
try {
    '{"session_id":"install-test","prompt":"test"}' | & node (Join-Path $HooksDir "aidd-log-prompt.js") 2>&1 | Out-Null
    Write-Host "    UserPromptSubmit hook: OK" -ForegroundColor Green
} catch {
    Write-Host "    UserPromptSubmit hook: FAILED" -ForegroundColor Red
}
try {
    '{"session_id":"install-test","prompt":"test"}' | & node (Join-Path $HooksDir "aidd-log-subagent-start.js") 2>&1 | Out-Null
    Write-Host "    SubagentStart hook: OK" -ForegroundColor Green
} catch {
    Write-Host "    SubagentStart hook: FAILED" -ForegroundColor Red
}
try {
    '{"session_id":"install-test","prompt":"test"}' | & node (Join-Path $HooksDir "aidd-log-subagent-stop.js") 2>&1 | Out-Null
    Write-Host "    SubagentStop hook: OK" -ForegroundColor Green
} catch {
    Write-Host "    SubagentStop hook: FAILED" -ForegroundColor Red
}
try {
    '{"session_id":"install-test","prompt":"test"}' | & node (Join-Path $HooksDir "aidd-log-stop.js") 2>&1 | Out-Null
    Write-Host "    Stop hook: OK" -ForegroundColor Green
} catch {
    Write-Host "    Stop hook: FAILED" -ForegroundColor Red
}
try {
    '{"session_id":"install-test","prompt":"test"}' | & node (Join-Path $HooksDir "aidd-log-session-end.js") 2>&1 | Out-Null
    Write-Host "    SessionEnd hook: OK" -ForegroundColor Green
} catch {
    Write-Host "    SessionEnd hook: FAILED" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Installation complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host " Next steps:" -ForegroundColor White
Write-Host "  Please restart Claude Code"
Write-Host ""
Write-Host " Uninstall:"
Write-Host "  powershell -ExecutionPolicy Bypass -File $(Join-Path $ScriptDir 'uninstall-win.ps1')"
Write-Host ""
