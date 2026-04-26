# ============================================================
# Claude Code Activity Tracker - Windows uninstaller (npx shim)
# ============================================================
# 旧スクリプトは setup/old/uninstall-win.legacy.ps1 に保管。
# ============================================================

[CmdletBinding()]
param(
    [switch]$Legacy,
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Args
)

$Package = "@classlab/claude-activity-tracker-hooks"

if ($Legacy) {
    $LegacyPath = Join-Path $PSScriptRoot "old\uninstall-win.legacy.ps1"
    if (Test-Path $LegacyPath) {
        & $LegacyPath @Args
        exit $LASTEXITCODE
    }
    Write-Error "Legacy uninstaller not found at $LegacyPath"
    exit 1
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Error "npx not found."
    exit 1
}

& npx $Package uninstall @Args
exit $LASTEXITCODE
