# ============================================================
# Claude Code Activity Tracker - Windows セットアップスクリプト
# ============================================================
# 使い方: powershell -ExecutionPolicy Bypass -File install-win.ps1
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

# --- 1. 前提条件チェック ---
Write-Host "[1/6] 前提条件をチェック中..." -ForegroundColor Yellow

$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Host "  ERROR: Node.js がインストールされていません" -ForegroundColor Red
    Write-Host "  https://nodejs.org/ からインストールしてください"
    exit 1
}

$nodeVer = & node -v
Write-Host "  Node.js: $nodeVer"

$gitPath = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitPath) {
    Write-Host "  WARNING: git が見つかりません" -ForegroundColor DarkYellow
}

Write-Host "  OK" -ForegroundColor Green
Write-Host ""

# --- 2. API接続情報の設定 ---
Write-Host "[2/6] API接続情報を設定中..." -ForegroundColor Yellow
$configPath = Join-Path $HooksDir "config.json"

# 既存の config.json から設定を読み込む
$ExistingApiUrl = ""
$ExistingApiKey = ""
if (Test-Path $configPath) {
    try {
        $existingConfig = Get-Content $configPath -Raw | ConvertFrom-Json
        $ExistingApiUrl = $existingConfig.api_url
        $ExistingApiKey = $existingConfig.api_key
    } catch {}
}

$DefaultApiUrl = if ($ExistingApiUrl) { $ExistingApiUrl } elseif ($DefaultSrcUrl) { $DefaultSrcUrl } else { "http://localhost:3001" }
$ApiUrl = Read-Host "  API URL [$DefaultApiUrl]"
if ([string]::IsNullOrWhiteSpace($ApiUrl)) {
    $ApiUrl = $DefaultApiUrl
}

# デフォルト config.json（配布元）から読み込み
$DefaultSrcUrl = ""
$DefaultSrcKey = ""
$defaultConfigPath = Join-Path $HooksSrc "config.json"
if (Test-Path $defaultConfigPath) {
    try {
        $defaultConfig = Get-Content $defaultConfigPath -Raw | ConvertFrom-Json
        $DefaultSrcUrl = $defaultConfig.api_url
        $DefaultSrcKey = $defaultConfig.api_key
    } catch {}
}

# API Key（既存またはデフォルトがある場合はスキップ）
if ($ExistingApiKey) {
    $ApiKey = $ExistingApiKey
    Write-Host "  API Key: (既存の設定を使用)"
} elseif ($DefaultSrcKey) {
    $ApiKey = $DefaultSrcKey
    Write-Host "  API Key: (デフォルト設定を使用)"
} else {
    Write-Host "  API Key（管理者から共有されたキーを入力してください）"
    $ApiKey = Read-Host "  API Key"
    if ([string]::IsNullOrWhiteSpace($ApiKey)) {
        $ApiKey = ""
        Write-Host "  WARNING: API Key が未入力です。サーバー側で認証が有効な場合、データ送信が拒否されます。" -ForegroundColor DarkYellow
    }
}

Write-Host ""
Write-Host "  設定内容:" -ForegroundColor White
Write-Host "    API URL:  $ApiUrl"
if ($ApiKey) { Write-Host "    API Key:  (設定済み)" } else { Write-Host "    API Key:  (未設定)" -ForegroundColor DarkYellow }
Write-Host ""

# --- 3. ディレクトリ作成 & フックファイルコピー ---
Write-Host "[3/6] フックファイルをインストール中..." -ForegroundColor Yellow

if (-not (Test-Path $HooksDir)) {
    New-Item -ItemType Directory -Path $HooksDir -Force | Out-Null
}

# shared/ サブディレクトリ作成
$SharedDir = Join-Path $HooksDir "shared"
if (-not (Test-Path $SharedDir)) {
    New-Item -ItemType Directory -Path $SharedDir -Force | Out-Null
}

# 6つのフックファイルをコピー
foreach ($file in @("log-session-start.js", "log-prompt.js", "log-subagent-start.js", "log-subagent-stop.js", "log-stop.js", "log-session-end.js")) {
    $src = Join-Path $HooksSrc $file
    if (Test-Path $src) {
        Copy-Item $src -Destination (Join-Path $HooksDir $file) -Force
        Write-Host "  コピー: $file"
    } else {
        Write-Host "  ERROR: $src が見つかりません" -ForegroundColor Red
        exit 1
    }
}

# shared/utils.js をコピー
$sharedSrc = Join-Path (Join-Path $HooksSrc "shared") "utils.js"
if (Test-Path $sharedSrc) {
    Copy-Item $sharedSrc -Destination (Join-Path $SharedDir "utils.js") -Force
    Write-Host "  コピー: shared/utils.js"
} else {
    Write-Host "  ERROR: $sharedSrc が見つかりません" -ForegroundColor Red
    exit 1
}

# package.json をコピー
$pkgSrc = Join-Path $HooksSrc "package.json"
if (Test-Path $pkgSrc) {
    Copy-Item $pkgSrc -Destination (Join-Path $HooksDir "package.json") -Force
    Write-Host "  コピー: package.json"
} else {
    Write-Host "  ERROR: $pkgSrc が見つかりません" -ForegroundColor Red
    exit 1
}

# config.json（BOMなしUTF-8で書き込み）
$configContent = @{
    api_url = $ApiUrl
    api_key = $ApiKey
    debug   = $true
} | ConvertTo-Json
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($configPath, $configContent, $utf8NoBom)
Write-Host "  作成: config.json"
Write-Host ""

# --- 4. npm 依存パッケージ プリインストール ---
Write-Host "[4/6] npm パッケージをプリインストール中..." -ForegroundColor Yellow

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
        Write-Host "  インストール完了: classic-level"
    } catch {
        Pop-Location
        Write-Host "  WARNING: classic-level のインストールに失敗しました" -ForegroundColor DarkYellow
    }
} else {
    Write-Host "  既にインストール済み: classic-level"
}
Write-Host ""

# --- 5. グローバル settings.json を更新 ---
Write-Host "[5/6] Claude Code グローバル設定を更新中..." -ForegroundColor Yellow

$SettingsFileJs = $SettingsFile -replace '\\', '/'
$HooksAbsPathJs = $HooksDir -replace '\\', '/'

# シングルクォートのヒアストリング（PowerShell が一切解釈しない）
# 既存のフック設定を保持しつつ、Tracker用フックをマージする
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
    SessionStart:      { command: "node \"__HOOKS_DIR__/log-session-start.js\"", timeout: 15 },
    UserPromptSubmit:  { command: "node \"__HOOKS_DIR__/log-prompt.js\"", timeout: 10 },
    SubagentStart:     { command: "node \"__HOOKS_DIR__/log-subagent-start.js\"", timeout: 10 },
    SubagentStop:      { command: "node \"__HOOKS_DIR__/log-subagent-stop.js\"", timeout: 15 },
    Stop:              { command: "node \"__HOOKS_DIR__/log-stop.js\"", timeout: 30 },
    SessionEnd:        { command: "node \"__HOOKS_DIR__/log-session-end.js\"", timeout: 10 },
};

for (const [event, def] of Object.entries(trackerHooks)) {
    if (!settings.hooks[event]) settings.hooks[event] = [];

    for (const group of settings.hooks[event]) {
        if (group.hooks) {
            group.hooks = group.hooks.filter(h => !h.command || !h.command.includes("/hooks/log-"));
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

# BOMなしUTF-8で書き込み（PowerShell 5.x の -Encoding UTF8 はBOM付きのため使わない）
$tmpScript = Join-Path $TmpDir "claude-setup-settings.js"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($tmpScript, $jsContent, $utf8NoBom)
& node $tmpScript
Remove-Item $tmpScript -ErrorAction SilentlyContinue
Write-Host ""

# --- 6. ヘルスチェック ---
Write-Host "[6/6] APIサーバーのヘルスチェック..." -ForegroundColor Yellow

try {
    $healthUrl = "$ApiUrl/health"
    $healthResult = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 5
    Write-Host "  API サーバー応答: OK" -ForegroundColor Green
    Write-Host "  レスポンス: $($healthResult | ConvertTo-Json -Compress)"
} catch {
    Write-Host "  WARNING: API サーバーに接続できません ($healthUrl)" -ForegroundColor DarkYellow
    Write-Host "  サーバーが起動していることを確認してください"
}
Write-Host ""

# --- 確認 ---
Write-Host "インストール確認..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  フックファイル:" -ForegroundColor White
Get-ChildItem -Path $HooksDir -Filter "*.js" | ForEach-Object { Write-Host "    $($_.Name)" }
if (Test-Path (Join-Path $HooksDir "shared")) {
    Get-ChildItem -Path (Join-Path $HooksDir "shared") -Filter "*.js" | ForEach-Object { Write-Host "    shared/$($_.Name)" }
}
Get-ChildItem -Path $HooksDir -Filter "package.json" | ForEach-Object { Write-Host "    $($_.Name)" }
Get-ChildItem -Path $HooksDir -Filter "config.json" | ForEach-Object { Write-Host "    $($_.Name)" }
Write-Host ""
Write-Host "  設定ファイル:" -ForegroundColor White
Write-Host "    $SettingsFile"
Write-Host ""

# テスト
Write-Host "  動作テスト..."
try {
    '{"session_id":"install-test","prompt":"test","model":"test"}' | & node (Join-Path $HooksDir "log-session-start.js") 2>&1 | Out-Null
    Write-Host "    SessionStart hook: OK" -ForegroundColor Green
} catch {
    Write-Host "    SessionStart hook: FAILED" -ForegroundColor Red
}
try {
    '{"session_id":"install-test","prompt":"test"}' | & node (Join-Path $HooksDir "log-prompt.js") 2>&1 | Out-Null
    Write-Host "    UserPromptSubmit hook: OK" -ForegroundColor Green
} catch {
    Write-Host "    UserPromptSubmit hook: FAILED" -ForegroundColor Red
}
try {
    '{"session_id":"install-test","prompt":"test"}' | & node (Join-Path $HooksDir "log-subagent-start.js") 2>&1 | Out-Null
    Write-Host "    SubagentStart hook: OK" -ForegroundColor Green
} catch {
    Write-Host "    SubagentStart hook: FAILED" -ForegroundColor Red
}
try {
    '{"session_id":"install-test","prompt":"test"}' | & node (Join-Path $HooksDir "log-subagent-stop.js") 2>&1 | Out-Null
    Write-Host "    SubagentStop hook: OK" -ForegroundColor Green
} catch {
    Write-Host "    SubagentStop hook: FAILED" -ForegroundColor Red
}
try {
    '{"session_id":"install-test","prompt":"test"}' | & node (Join-Path $HooksDir "log-stop.js") 2>&1 | Out-Null
    Write-Host "    Stop hook: OK" -ForegroundColor Green
} catch {
    Write-Host "    Stop hook: FAILED" -ForegroundColor Red
}
try {
    '{"session_id":"install-test","prompt":"test"}' | & node (Join-Path $HooksDir "log-session-end.js") 2>&1 | Out-Null
    Write-Host "    SessionEnd hook: OK" -ForegroundColor Green
} catch {
    Write-Host "    SessionEnd hook: FAILED" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " インストール完了!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host " 次のステップ:" -ForegroundColor White
Write-Host "  Claude Code を再起動してください"
Write-Host ""
Write-Host " アンインストール:"
Write-Host "  powershell -ExecutionPolicy Bypass -File $(Join-Path $ScriptDir 'uninstall-win.ps1')"
Write-Host ""
