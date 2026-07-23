# OpenAI Codex Setup

Use current official Codex documentation as the source of truth if commands change.

## Install on macOS/Linux

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

## Start

```bash
cd ~/Projects/CurbSitter
codex
```

Sign in when prompted. Codex reads root `AGENTS.md` before work. Keep it concise enough for the documented instruction-size limit; detailed truth remains in the files it is required to read.

## First prompt

Paste the contents of `prompts/00_MASTER_BOOTSTRAP.md`, or say:

```text
Read AGENTS.md and the mandatory project files it names. Do not code yet. Audit the repository against Phase 0, list conflicts and missing prerequisites, then execute only the current TODO ticket after creating a Git checkpoint.
```

Use `/permissions` deliberately and `/review` before committing sensitive work. Commit before and after focused tasks.
