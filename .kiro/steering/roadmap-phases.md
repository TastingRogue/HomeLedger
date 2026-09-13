---
inclusion: auto
---

# Roadmap phases & branch discipline (read before touching ROADMAP work)

`ROADMAP.md` has **two independent tracks with two different label prefixes**. They
have collided before and caused work to start on the wrong one. Do not repeat that.

## The two tracks

- **v1 track → `P#`** (`P0`, `P1`, `P2`, `P3`, `P4`, `P5`). These are the
  `## Phase P#` sections in `ROADMAP.md`. `## Phase P4 — Feature depth` (P4.1…P4.14)
  is the **current, active** work.
- **v2 / Life-OS track → `L#`** (`L1`…`L5`), under
  `## Post-1.0 — Personal Life & Finance OS`. This is **future / post-1.0** work.

## Hard rules

1. **A bare "P4" / "P5" ALWAYS means the v1 phase of that number.** Never assume it
   means a Life-OS phase. If the user says "continue with P4", it is
   `## Phase P4 — Feature depth` — confirm the specific `P4.x` sub-item before coding.
2. **Never start `L#` (Life-OS / v2) work unless the user names it by its `L#`
   label explicitly.** "Assets", "warranty", "documents", "maintenance" belong to the
   v2 track — do not begin them off a vague request.
3. **If a request is ambiguous about which track/phase, ASK first.** One clarifying
   question is far cheaper than building the wrong track (which already happened once).
4. **Never merge a parked/ahead-of-schedule branch to `main` without explicit
   approval.** See the "Parked branches" list at the bottom of the Life-OS section in
   `ROADMAP.md`. In particular, branch **`p4-assets`** carries DB migration `0008`
   (renames `assets.value`→`current_value`) and a 1.1.0 backup-format bump — these are
   v2-track changes and must not land on `main` until the v2 track officially starts.
5. **Migrations are one-way on shared branches.** Do not add a schema migration to
   `main` for future-track features. Keep migration numbering contiguous only within
   the track that will actually ship it.

## When starting any roadmap task

- Restate which track (`P#` vs `L#`) and which exact sub-item you believe is meant,
  and get a yes before implementing.
- Keep each phase's work on its own branch; do not mix tracks in one branch.
- After finishing, update the matching checkbox in `ROADMAP.md` (`[ ]` → `[x]`, or
  `[~]` for "built but parked/unmerged") and note the branch.
