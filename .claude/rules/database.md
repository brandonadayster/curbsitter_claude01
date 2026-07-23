# Database rule

All schema changes use committed migrations, explicit RLS, indexes justified by queries, and tests. Prefer backward-compatible migrations. Never edit production manually through an agent.
