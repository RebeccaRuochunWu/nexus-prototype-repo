# Nexus — task QC prototype (Tandem Forge take-home)

A single-file prototype for the smallest Nexus workflow: **author a task version → runner and grader score the agent → expert reviewer checks the grader's verdict → QC gates → accept or return with a reason → build a collection that pins exact accepted versions.**

Supporting notes (Task 1–3, buyer message, ≤800 words): [`NOTES.md`](NOTES.md)

## Try it (3 steps)

1. Download or clone this repo and open `index.html` in a browser. No install or server is needed.
2. Go to **QC report & tests**. The top table is the **task QC report**: it grades the tasks, and C01 and D01 are expected to fail. The bottom table has the **platform tests**: click **Run platform tests** to run 20 checks that Nexus itself behaves correctly (for example, that it blocks accepting C01).
3. Walk the flow by hand in **1 · Tasks & review**. Each task page follows the order ① definition → ② run & grader verdict (automatic) → ③ reviewer check (you, the final gate) → ④ QC gates → ⑤ decision.
   - **Accept path:** open **B01**, click **Confirm reviewer check**, enter a reason, and click **Accept**.
   - **Return, edit, re-review:** open **C01**, confirm the check (Accept stays blocked by G1–G4), then **Return** with a reason. Click **Edit**, fix the initial state, and save as **C01@v2**. Record a new run (②), set the reviewer check (cause `model`, verdict `agrees`, tick reset and reference), confirm it, then **Accept**.
   - **Collect:** go to **2 · Collections → Build**. It is disabled until something is accepted, and it pins `B01@v1` and `C01@v2` with their hashes.
   - **Task 3 change:** accept **B02** under rules v1 and build (B02@v1 ships; its unchecked clause shows a ⚠ warning). Switch the header to **rules v2** and build again (B02 is excluded by G5). Edit B02 so the grader checks the quote link, re-run, re-check, accept, and build (B02@v2 ships).

## What's inside

| Concept | Where to look |
|---|---|
| Storage model | **Data & log**: expandable tree of tasks → immutable versions { content + hash, run (runner/grader), check (reviewer) } → reviews (version, hash, gate/run/check snapshot) → frozen collections |
| QC rules | `gates()` in `index.html`: G0 run is for this version (runner), G1 reset, G2 task, G3 outcome, G4 training signal (reviewer), G5 full grader coverage (system, rules v2) |
| Collection rule | `buildCollection()`: per task, the newest version that is accepted **and** still passes current gates; out-of-scope pools are excluded with a reason |
| Seed data | `SEED` in `index.html`: the four supplied records (A01–D01) with extended fields, plus B02 added for Task 3. Reviewer checks start as drafts pre-filled from each record's reference evidence |

## Verification

- Platform tests in the app: 20/20 pass.
- `tests/walkthrough.mjs` drives the real UI in headless Chromium and checks 23 assertions, including the task QC report, the before/after collections, and the storage tree. All 23 pass. To run it: `npm i playwright && node tests/walkthrough.mjs`. Screenshots are in `tests/screens/`.

## Limitations

- Graders are modelled as metadata (what they check and which success clauses they cover), not as executable reward functions. The existing runner executes graders, and Pass/Fail comes from supplied run evidence. A next step is executable clause checks over a recorded final state, so coverage (G5) is derived instead of ticked by hand.
- State is in memory and resets on refresh. Runs are entered by hand in place of the runner.
- Each version has one recorded run. Pass rates across attempts, reviewer agreement, and the customer feedback loop are not modelled.
- There is no auth, and reviewer names are free text.
