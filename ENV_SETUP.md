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

### Mapbox

Two variables, because maps and geocoding run in different places:

| Variable | Used by | Runs |
|---|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Map tiles (`src/components/map/map-base.tsx`) | Browser |
| `MAPBOX_SERVER_TOKEN` | Geocoding (`src/lib/geocode.ts` — every caller) | Server |

**Local dev:** one unrestricted public (`pk.`) token in both variables is fine, and
is how this repo is currently set up.

**The trap — URL restrictions.** A URL-restricted token is validated against the
request's `Referer` header. Server-side calls don't send one, so a restricted token
returns **403 Forbidden** for geocoding. Because `geocode()` returns `null` on
failure, that looks *identical* to "no token configured" — silently unresolved
addresses, no error. If addresses stop geocoding, check this first.

So a URL-restricted token can only ever be the *browser* one, never the server one.

**Production.** Prefer two separate tokens: a URL-restricted one for
`NEXT_PUBLIC_MAPBOX_TOKEN` (it ships in the client bundle, where anyone can read it —
the restriction is what stops a lifted token being spent against your quota), and an
unrestricted one for `MAPBOX_SERVER_TOKEN`. `MAPBOX_SERVER_TOKEN` is deliberately not
`NEXT_PUBLIC_` so it never reaches the bundle. Never put an `sk.` secret token in
either variable.

Both need the default public scopes (`styles:tiles`, `styles:read`, `fonts:read`).

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
