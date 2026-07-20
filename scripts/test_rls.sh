#!/usr/bin/env bash
# Run the RLS smoke test against the local Supabase database.
# Uses psql if installed, otherwise the supabase_db docker container.
set -euo pipefail

cd "$(dirname "$0")/.."
SQL_FILE="tests/rls/rls_smoke.sql"
DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

if command -v psql >/dev/null 2>&1; then
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
else
  docker exec -i supabase_db_CurbSitter psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$SQL_FILE"
fi
