#!/usr/bin/env bash
set -euo pipefail
if [[ -n "$(find . -mindepth 1 -maxdepth 1 ! -name '.git' ! -name 'AI_Agent_Project_Kit' -print -quit)" ]]; then
  echo "Run only from a prepared project root or execute Phase 0 manually."
fi
command -v git >/dev/null || { echo "Install Git first."; exit 1; }
command -v node >/dev/null || { echo "Install current active LTS Node first."; exit 1; }
command -v pnpm >/dev/null || { echo "Enable Corepack/install pnpm first."; exit 1; }
echo "Foundation available. Use prompts/00_MASTER_BOOTSTRAP.md with your agent; this script intentionally does not install an unreviewed stack."
