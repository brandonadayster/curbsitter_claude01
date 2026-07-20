# Claude Code Setup

Use current official Claude Code documentation as the source of truth if commands change.

## Install stable on macOS/Linux/WSL

```bash
curl -fsSL https://claude.ai/install.sh | bash -s stable
```

## Start

```bash
cd ~/Projects/CurbSitter
claude
```

Claude Code reads `CLAUDE.md`; this project imports `AGENTS.md` from it so the tools share one contract. Path-specific rules are in `.claude/rules/`.

## First prompt

```text
Read CLAUDE.md and every mandatory project file. Enter plan mode. Audit the repository against Phase 0, identify conflicts and missing prerequisites, then execute only the current TODO ticket. Do not change business decisions or production infrastructure.
```

Do not auto-accept destructive commands, deployments, production database changes, credentials, or billing actions.
