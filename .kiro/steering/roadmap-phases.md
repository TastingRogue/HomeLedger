---
inclusion: auto
---

# Roadmap phases & branch discipline (read before touching ROADMAP work)

`ROADMAP.md` has **two independent tracks with two different label prefixes**. They
have collided before and caused work to start on the wrong one. Do not repeat that.

## The two tracks

- **v1 track → `P#`** (`P0`, `P1`, `P2`, `P3`, `P4`). These are the `## Phase P#`
  sections in `ROADMAP.md`. `P0`–`P3` are the 1.0.0 work (done);
  `## Phase P4 — v1.x incremental depth` (`P4.1`…`P4.14`) is the **current, active**
  track and ships as 1.1/1.2/…. There is **no `Phase P5`** — anything "P5" you recall
  was the old Life-OS numbering, now `L2`.
- **v2 / Life-OS track → `L#`** (`L1`…`L5`), under
  `## Post-1.0 — Personal Life & Finance OS`. This is **future / post-1.0** work.

## Hard rules

1. **A bare "P4" ALWAYS means the v1 phase** (`## Phase P4 — v1.x incremental
   depth`), never a Life-OS phase. If the user says "continue with P4", confirm the
   specific `P4.x` sub-item before coding. ("P5" is not a valid v1 phase — if the
   user says P5, they likely mean the Life-OS `L2`; ask.)
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

## Branch strategy for P4 (agreed with the maintainer)

- **One integrator branch for the whole `P4` phase: `p4-feature-depth`.** Every
  `P4.x` sub-item is built ON this branch (stacked commits), NOT on separate branches
  merged individually. Migrations stay contiguous (0008, 0009, … on this one branch).
- **Do NOT merge `p4-feature-depth` to `main` until ALL of P4 (the sub-items the
  maintainer wants) is done.** The merge to `main` happens once, at the end of the
  phase, as a single integration — never per sub-item.
- History note: `p4.1-richer-transactions` and `p4.2-credit-cards` were the original
  per-sub-item branches; their work now lives in `p4-feature-depth` (which was cut
  from the tip of `p4.2-credit-cards`, so it already contains P4.1 + P4.2). Continue
  P4.3+ directly on `p4-feature-depth`.
- The same pattern applies to future multi-sub-item phases: one integrator branch per
  phase, merged to `main` only when the phase is complete.

## When starting any roadmap task

- Restate which track (`P#` vs `L#`) and which exact sub-item you believe is meant,
  and get a yes before implementing.
- Keep each phase's work on its own branch; do not mix tracks in one branch.
- After finishing, update the matching checkbox in `ROADMAP.md` (`[ ]` → `[x]`, or
  `[~]` for "built but parked/unmerged") and note the branch.
