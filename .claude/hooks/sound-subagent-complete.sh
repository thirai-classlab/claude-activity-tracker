#!/usr/bin/env bash
# SubagentStop hook: play a short ping when a delegated sub-agent finishes.
# macOS only.
set -u

if command -v afplay >/dev/null 2>&1; then
  # Pop = brief subtle tone, good for intermediate notifications
  afplay /System/Library/Sounds/Pop.aiff >/dev/null 2>&1 &
fi

exit 0
