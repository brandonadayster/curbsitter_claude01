# Google Antigravity 2.0 Setup

Antigravity's public installation and interface details may change. Download and install only from Google's official Antigravity site, sign in, and open the local CurbSitter Git repository as the workspace. Do not rely on copied third-party installer commands.

## Workspace preparation

1. Create/open `~/Projects/CurbSitter`.
2. Copy this entire kit into the repository root.
3. Ensure Git is initialized and a clean checkpoint exists.
4. Give the agent workspace access, not unrestricted system or production access.
5. Point the agent first to `AGENTS.md`, `PROJECT_TRUTH.md`, and `TODO.md`.

## First instruction

```text
Act as the implementation agent for this repository. Read AGENTS.md and all mandatory documents. Treat PROJECT_TRUTH.md as authoritative. Audit Phase 0 and execute only the current TODO ticket. Use small reversible commits, run all checks, and update TODO.md. Do not use production credentials, deploy, or change business decisions without explicit approval.
```

Use separate focused agent sessions for architecture/security review, implementation, and QA rather than asking one agent to build the entire stack in a single pass.
