#!/usr/bin/env bash
# Stop hook: play a completion sound (main agent turn end).
# macOS only. On other platforms this is a no-op.
set -u

if command -v afplay >/dev/null 2>&1; then
  # Glass = clear, satisfying completion tone
  afplay /System/Library/Sounds/Glass.aiff >/dev/null 2>&1 &
fi

# Do not block stop.
exit 0
