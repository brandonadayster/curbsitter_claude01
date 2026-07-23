# Independent Code Review Prompt

Review the current diff against `PROJECT_TRUTH.md`, `AGENTS.md`, and the ticket acceptance criteria. Do not modify code on the first pass. Prioritize findings by severity and include file/line references. Focus on:

- authorization/RLS and tenant leakage,
- access secrets and proof-photo privacy,
- webhook/payment idempotency,
- route/task state correctness,
- fabricated or unverified public claims,
- business rules hardcoded outside configuration,
- accessibility and mobile field usability,
- missing failure/retry/empty states,
- test gaps and migration safety.

After findings are approved, fix them in small commits and rerun checks.
