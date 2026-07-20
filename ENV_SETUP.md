# Local Environment Setup

## Recommended machine baseline

macOS, Linux, or Windows with WSL2; Git; a current browser; password manager; and separate test accounts for external providers.

## Install foundations

1. Install Git.
2. Install Node's current active LTS using a version manager.
3. Enable Corepack and install pnpm.
4. Install Docker Desktop/Engine if using local Supabase.
5. Install the Supabase CLI following current official instructions.
6. Install the chosen coding agent using its official current instructions in `tools/`.

Example after Node is installed:

```bash
corepack enable
corepack prepare pnpm@latest --activate
node --version
pnpm --version
git --version
```

## Create the repository

```bash
mkdir -p ~/Projects
cd ~/Projects
mkdir CurbSitter && cd CurbSitter
git init
```

Copy this entire agent kit into the repository root before starting the coding agent.

## Bootstrap workflow

Have the agent execute Phase 0 rather than pasting one giant "build everything" prompt. It should initialize the current stable app, pin exact versions, add scripts/CI, and commit. Then execute one ticket at a time from `TODO.md`.

## Provider accounts

Create separate test/staging/production resources for Supabase, Stripe, email, SMS, maps, Vercel, Sentry, and analytics. Keep secrets in environment managers and local `.env.local`, never Git.

## Environment variables

Copy `.env.example` to `.env.local` and fill only test values. The agent must document every added variable.

## Verification

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

After the runner feature exists, verify camera/location permissions through HTTPS on a real phone; localhost desktop testing is not enough.
