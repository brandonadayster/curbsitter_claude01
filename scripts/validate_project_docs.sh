#!/usr/bin/env bash
set -euo pipefail
required=(PROJECT_TRUTH.md DECISION_REGISTER.md BUSINESS_CONFIG.md PRICING_SERVICE_MODEL.md PRD.md APP_FLOW.md TECH_STACK.md TODO.md AGENTS.md CLAUDE.md SECURITY_PRIVACY.md)
for f in "${required[@]}"; do
  [[ -s "$f" ]] || { echo "Missing or empty: $f"; exit 1; }
done
forbidden='public bucket|proof_of_work_photos.*public|residential pet waste|pooper scooper|fake testimonial|guaranteed HOA compliance|\+\$15 processing fee'
targets=()
for d in src app public supabase; do [[ -e "$d" ]] && targets+=("$d"); done
if (( ${#targets[@]} > 0 )) && grep -RniE "$forbidden" "${targets[@]}"; then
  echo "Review forbidden/retired production language above."
  exit 1
fi
echo "Project document checks passed."
