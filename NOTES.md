# Nexus — Supporting Notes

## Task 1 · MVP

**Bet.** About 40 verified B tasks, plus C once its resets are repaired, instead of 500. Target capability: holding constraints across documents, policies, and tools. Aster has templated volume; it can't cheaply build expert-solved, state-graded tasks with attributed failures.

**Why B and C (12 expert-hours: B 8h, C 4h).** B matches Aster's gap (constraints across contracts, quotes, orders), is expert-solved, and fails 44%: hard but learnable. C is expert-sourced; its 96% failure is inflated by fixable reset bugs. D needs a new grader first (engineering work).

**Rejected:** A: 12 labels on one template, data Aster already has.

**Principle.** The model learns whatever the grader rewards, so Nexus checks three validities plus training signal per version:

| Gate | Question | Fails |
|---|---|---|
| Reset (G1) | Does every run start from the intended state? | C01 |
| Task (G2) | Has anyone solved it with the supplied tools? | C01, D01 |
| Outcome (G3) | Does the grader read final state, and did review agree? | D01 |
| Signal (G4) | Is the failure the model's? | C01, D01 |
| **Coverage (G5, added in Task 3)** | **Does the grader check every success clause?** | **B02@v1** |

- **Diversity:** distinct constraint patterns and template families, not industry labels. A01's 12 variants count as 1.
- **Realism:** real workflows with a reference solve.
- **Complexity:** constraints carried across 2 or more sources, not raw failure rate.

**MVP (3):** a versioned task registry with evidence attached per version; evidence-gated accept/return decisions with reasons; a collection builder that pins exact version plus hash.
**Deferred:** runner auto-import; a customer feedback portal (ops logs it manually).

**Minimum data:** task → immutable versions (instruction, state, tools, success clauses, grader coverage, hash) → grader verdict → reviewer check → reviews (version, hash, gate snapshot) → collections (frozen version + hash list).

**Assumption:** B-style constraint failures transfer to Aster's private tasks.
**Decision tested:** can reviewers make consistent, evidence-backed calls fast enough to ship a verified collection?

## Task 2 · Prototype judgment

- **Useful model failure: B01.** Every gate passes, and the agent dropped the arrival-date constraint → accept.
- **Needs repair: C01.** snapshot-17 is missing and there's no reference run → return, fix the reset (v2), re-run, re-check → accept. The collection pins C01@v2.
- **D01's false pass** is blocked by G3; A01 is valid but out of scope.

**Worked:** return → edit → re-review; edits never alter built collections.
**Limitation:** graders are metadata, not executable reward functions; the runner executes them; evidence is one hand-entered run. Next: executable clause checks over recorded final state.

## Task 3 · Launch, measure, adapt

**First 48h.** Day 1 kickoff: the 30-minute call confirms target constraints and held-out evaluation; the integration engineer runs one task end to end. Days 1–2: three experts sample 10 B tasks across all six workflows, tag failure causes, and double-review two. One expert repairs C and runs the return path. If Aster is unavailable: use their stated constraints, send questions async, hold out an internal split.

**Owners.** Week 1: 12h investigation, 3h authoring, 3h QC. Weeks 2–4: 9h authoring and repair, 9h QC per week. The data ops lead owns feedback: traces, pre-reads, logging against versions.

**Measures:** (1) held-out lift versus a matched comparison; (2) grader precision: share of random passes with correct final state; (3) expert hours per accepted task.
**Comparison:** the same training budget on Aster's templated tasks, evaluated on the same held-out set, run twice.
**Expand** if we beat the comparison, precision is ≥95%, and effort is ≤2h per task. **Revise** if training improves without held-out gains. **Stop** if held-out stays flat after grader fixes.

**Pilot response.** Training doubled, held-out stayed flat, and 3 of 10 passes had the wrong state: the data may teach grader-gaming.
- **Investigate:** audit 30 random passes against every success clause.
- **Scope change:** freeze expansion. Only ship tasks whose grader covers all clauses.
- **Change:** rule v2 adds **G5** (see table).
- **Before/after (new case B02):** B02's state grader skips the quote link. Under v1 it was accepted and shipped as B02@v1 in COL-1. Under v2 it is excluded from COL-2. After the fix it is B02@v2, re-reviewed, and shipped in COL-3.

**Buyer message**
> Recommendation: don't expand yet. Training rose 40→82%, but held-out moved only 34→35%, and 3 of 10 sampled passes ended in the wrong state, so our graders may be rewarding the wrong behavior. This week we'll audit random passes and ship only tasks whose graders check every success condition. To decide, we need a repeat run, a matched comparison on the same held-out set, and about 20 failed held-out traces.

## Setup, checks, disclosure

1. Open `index.html` in any browser (no install).
2. **QC report & tests → Run platform tests** (20).
3. Try B01 accept, C01 return/edit, then Collections under rules v1 vs v2.

`tests/walkthrough.mjs` (headless UI test): 24/24 pass. In-memory state; refresh resets.
**Time:** ~3 h. **AI:** built with Claude (research, code, drafting); I reviewed and ran every flow.
