# ============================================================
# Claude Code Activity Tracker - Windows installer (npx shim)
# ============================================================
# 旧スクリプトは setup/old/install-win.legacy.ps1 に保管。
# npm publish 後は npx 経由が SSOT。
# ============================================================

[CmdletBinding()]
param(
    [switch]$Legacy,
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Args
)

$Package = "@classlab/claude-activity-tracker-hooks"

if ($Legacy) {
    $LegacyPath = Join-Path $PSScriptRoot "old\install-win.legacy.ps1"
    if (Test-Path $LegacyPath) {
        & $LegacyPath @Args
        exit $LASTEXITCODE
    }
    Write-Error "Legacy installer not found at $LegacyPath"
    exit 1
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Error "npx not found. Node.js 18+ required (https://nodejs.org/)."
    exit 1
}

Write-Host "▷ Running: npx $Package install $($Args -join ' ')"
Write-Host "  (旧手動セットアップが必要な場合は -Legacy フラグを使用)"
Write-Host ""

& npx $Package install @Args
exit $LASTEXITCODE
