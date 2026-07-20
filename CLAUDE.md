@AGENTS.md

# Claude Code additions

- Use plan mode for changes spanning more than three files, schema migrations, auth, billing, storage, or route state machines.
- Put durable, path-specific rules in `.claude/rules/` rather than bloating this file.
- Do not use auto-accept for destructive commands, production database changes, credential actions, deployment, or billing configuration.
- After implementation, run a separate review pass focused on permissions, webhook idempotency, private photo access, and business-rule drift.
