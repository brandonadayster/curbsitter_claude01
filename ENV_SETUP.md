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

### Mapbox — two tokens, not one

Maps and geocoding need **different** tokens, because they run in different places:

| Variable | Used by | Must be |
|---|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Map tiles in the browser (`src/components/map/map-base.tsx`) | Public `pk.`, **URL-restricted** to your origins |
| `MAPBOX_SERVER_TOKEN` | Geocoding (`src/lib/geocode.ts`, all callers server-side) | Public `pk.`, **NOT URL-restricted** |

Why they can't be the same token: a URL-restricted token is validated against the
request's `Referer` header. Server-side calls don't send one, so a restricted token
returns **403 Forbidden** for geocoding — and `geocode()` returns `null` on failure,
so this looks *identical* to "no token configured". If addresses silently fail to
resolve, check this first.

`MAPBOX_SERVER_TOKEN` is deliberately not `NEXT_PUBLIC_` — it must never reach the
browser bundle, since it carries no URL restriction. Never put an `sk.` secret token
in either variable.

Both need the default public scopes (`styles:tiles`, `styles:read`, `fonts:read`).
Restrict the browser token to `localhost:3000`, `localhost:3001`, and your deployed
domains.

**CSP:** `next.config.ts` must keep `https://api.mapbox.com` in both `connect-src`
and `img-src`, or the browser blocks the style request and every map silently falls
back to its table view.

## Verification

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

After the runner feature exists, verify camera/location permissions through HTTPS on a real phone; localhost desktop testing is not enough.
