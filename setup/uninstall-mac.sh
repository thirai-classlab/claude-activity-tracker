#!/bin/bash
# ============================================================
# Claude Code Activity Tracker - macOS Uninstaller
# ============================================================

set -e

CLAUDE_DIR="$HOME/.claude"
HOOKS_DIR="$CLAUDE_DIR/hooks"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

echo "========================================"
echo " Claude Code Activity Tracker Uninstaller"
echo "========================================"
echo ""

read -p "Remove hooks and restore settings? (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Cancelled."
    exit 0
fi

# Remove hook files
echo "Removing hook files..."
for FILE in aidd-log-session-start.js aidd-log-prompt.js aidd-log-subagent-start.js aidd-log-subagent-stop.js aidd-log-stop.js aidd-log-session-end.js config.json package.json .claude-email-cache debug.log; do
    if [ -f "$HOOKS_DIR/$FILE" ]; then
        rm "$HOOKS_DIR/$FILE"
        echo "  Removed: $FILE"
    fi
done

# Remove shared/ directory
if [ -d "$HOOKS_DIR/shared" ]; then
    rm -rf "$HOOKS_DIR/shared"
    echo "  Removed: shared/"
fi

# Remove hooks directory if empty
if [ -d "$HOOKS_DIR" ] && [ -z "$(ls -A "$HOOKS_DIR")" ]; then
    rmdir "$HOOKS_DIR"
    echo "  Removed: hooks/"
fi

# Remove tracker hooks from settings.json (preserve other hooks)
if [ -f "$SETTINGS_FILE" ]; then
    echo "Removing tracker hooks from settings.json..."
    node -e "
const fs = require('fs');
const path = '$SETTINGS_FILE';
try {
    const s = JSON.parse(fs.readFileSync(path, 'utf8'));
    if (s.hooks) {
        for (const event of Object.keys(s.hooks)) {
            if (Array.isArray(s.hooks[event])) {
                for (const group of s.hooks[event]) {
                    if (group.hooks) {
                        group.hooks = group.hooks.filter(h => !h.command || !h.command.includes('/hooks/aidd-log-'));
                    }
                }
                s.hooks[event] = s.hooks[event].filter(g => g.hooks && g.hooks.length > 0);
                if (s.hooks[event].length === 0) delete s.hooks[event];
            }
        }
        if (Object.keys(s.hooks).length === 0) delete s.hooks;
    }
    fs.writeFileSync(path, JSON.stringify(s, null, 2) + '\n', 'utf8');
    console.log('  Updated: ' + path);
} catch(e) { console.log('  Skipped: ' + e.message); }
"
fi

# Cleanup temp files
LEVELDB_DIR="$(node -e "console.log(require('os').tmpdir())")/claude-hook-leveldb"
if [ -d "$LEVELDB_DIR" ]; then
    rm -rf "$LEVELDB_DIR"
    echo "  Removed: claude-hook-leveldb (tmp)"
fi

echo ""
echo "Uninstall complete."
echo "Please restart Claude Code."
echo ""
