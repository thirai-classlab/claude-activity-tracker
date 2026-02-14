# ============================================================
# Claude Code Activity Tracker - Windows アンインストーラー
# ============================================================
# 使い方: powershell -ExecutionPolicy Bypass -File uninstall-win.ps1
# ============================================================

$ErrorActionPreference = "Stop"

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$ClaudeDir = Join-Path $env:USERPROFILE ".claude"
$HooksDir = Join-Path $ClaudeDir "hooks"
$SettingsFile = Join-Path $ClaudeDir "settings.json"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Claude Code Activity Tracker Uninstaller" -ForegroundColor Cyan
Write-Host " for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$confirm = Read-Host "フックを削除して設定を復元しますか？ (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "キャンセルしました。"
    exit 0
}

# --- 1. フックファイル削除 ---
Write-Host ""
Write-Host "[1/3] フックファイルを削除中..." -ForegroundColor Yellow

# shared/ サブディレクトリを削除
$SharedDir = Join-Path $HooksDir "shared"
if (Test-Path $SharedDir) {
    Remove-Item $SharedDir -Recurse -Force
    Write-Host "  削除: shared/"
}

# 6つのフックファイル + 設定ファイル + キャッシュファイルを削除
foreach ($file in @("aidd-log-session-start.js", "aidd-log-prompt.js", "aidd-log-subagent-start.js", "aidd-log-subagent-stop.js", "aidd-log-stop.js", "aidd-log-session-end.js", "package.json", "config.json", ".claude-email-cache", "debug.log")) {
    $path = Join-Path $HooksDir $file
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Host "  削除: $file"
    }
}

# hooks ディレクトリが空なら削除
if ((Test-Path $HooksDir) -and ((Get-ChildItem $HooksDir | Measure-Object).Count -eq 0)) {
    Remove-Item $HooksDir -Force
    Write-Host "  削除: hooks/"
}

# --- 2. settings.json から hooks セクション削除 ---
Write-Host ""
Write-Host "[2/3] settings.json からフック設定を削除中..." -ForegroundColor Yellow

if (Test-Path $SettingsFile) {
    $SettingsFileJs = $SettingsFile -replace '\\', '/'

    $jsTemplate = @'
const fs = require("fs");
const p = "__SETTINGS_PATH__";
try {
    const s = JSON.parse(fs.readFileSync(p, "utf8"));
    if (s.hooks) {
        for (const event of Object.keys(s.hooks)) {
            if (Array.isArray(s.hooks[event])) {
                for (const group of s.hooks[event]) {
                    if (group.hooks) {
                        group.hooks = group.hooks.filter(h => !h.command || !h.command.includes("/hooks/aidd-log-"));
                    }
                }
                s.hooks[event] = s.hooks[event].filter(g => g.hooks && g.hooks.length > 0);
                if (s.hooks[event].length === 0) delete s.hooks[event];
            }
        }
        if (Object.keys(s.hooks).length === 0) delete s.hooks;
    }
    fs.writeFileSync(p, JSON.stringify(s, null, 2) + "\n", "utf8");
    console.log("  Updated: " + p);
} catch(e) { console.log("  Skipped: " + e.message); }
'@

    $jsContent = $jsTemplate.Replace('__SETTINGS_PATH__', $SettingsFileJs)

    $TmpDir = & node -e "console.log(require('os').tmpdir())"
    # BOMなしUTF-8で書き込み（PowerShell 5.x の -Encoding UTF8 はBOM付きのため使わない）
    $tmpScript = Join-Path $TmpDir "claude-uninstall.js"
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($tmpScript, $jsContent, $utf8NoBom)
    & node $tmpScript
    Remove-Item $tmpScript -ErrorAction SilentlyContinue
} else {
    Write-Host "  スキップ: settings.json が見つかりません"
}

# --- 3. 一時ファイル削除 ---
Write-Host ""
Write-Host "[3/3] 一時ファイルを削除中..." -ForegroundColor Yellow

if (-not $TmpDir) {
    $TmpDir = & node -e "console.log(require('os').tmpdir())"
}
$LevelDbDir = Join-Path $TmpDir "claude-hook-leveldb"
if (Test-Path $LevelDbDir) {
    Remove-Item $LevelDbDir -Recurse -Force
    Write-Host "  削除: claude-hook-leveldb (tmp)"
} else {
    Write-Host "  スキップ: claude-hook-leveldb なし"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " アンインストール完了!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host " Claude Code を再起動してください" -ForegroundColor White
Write-Host ""
