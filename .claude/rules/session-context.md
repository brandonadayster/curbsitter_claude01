# Session and context rule

Write durable state as the work happens, not at session end. A `TODO.md` ticket entry, and any `DECISION_REGISTER.md` entry, belong in the same commit as the code they describe — so the record survives an unplanned session loss and no handoff has to reconstruct it later.

A long session does not by itself require a restart: context is summarized automatically when it grows. Prefer `/compact` with instructions naming what to preserve over starting a new session; reserve a new session for a genuine change of task.

When a session switch is warranted, write `HANDOFF.md` covering only what the mandatory startup documents do not already carry: decisions that changed an approved plan mid-flight, bugs found and the trap behind them, placeholder values still awaiting a real number, and the local fixtures or environment gaps needed to reproduce the work. Do not restate `TODO.md`, `DECISION_REGISTER.md`, plan files, or commit messages — link to them. Replacing a stale `HANDOFF.md` is fine once its work is committed; check it is in git history first.

Transcript volume, not reasoning, is what consumes context. Batch browser verification into fewer, larger passes, prefer targeted reads over repeated full-file reads, and do not re-read a file already edited this session to confirm the edit landed.
