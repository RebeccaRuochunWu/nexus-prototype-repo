# Nexus — task QC prototype (Tandem Forge take-home)

A single-file prototype for the smallest Nexus workflow: **author a task version → attach outcome evidence → pass QC gates → accept or return with a reason → build a collection that pins exact accepted versions.**

Supporting notes (Task 1–3, buyer message, ≤800 words): [`NOTES.md`](NOTES.md)

## Try it (3 steps)

1. Download or clone this repo and open `index.html` in a browser. No install or server is needed.
2. Go to **Self-checks → Run self-checks**. 19 scripted flows run against a fresh copy of the seed data.
3. Walk the flows by hand:
   - **Accept path:** open **B01**, enter a reason, and click **Accept**.
   - **Return, edit, re-review:** open **C01** (Accept is blocked), then **Return**. Click **Edit**, change the initial state, and save as **C01@v2**. Update the evidence (cause `model`, tick reset and reference) and **Accept**.
   - **Collection:** go to **Collections → Build**. It pins `B01@v1` and `C01@v2`, each with its content hash.
   - **Task 3 change:** accept **B02** under rules v1 and build (B02@v1 ships). Switch the header to **rules v2** and build again (B02 is excluded by G5). Edit B02 to grade the quote link, re-review, and build (B02@v2 ships).

## What's inside

| Concept | Where to look |
|---|---|
| Storage model | **Data & log** tab shows raw state: tasks → immutable versions (content, hash, evidence) → reviews (version, hash, gate and evidence snapshot) → frozen collections |
| QC rules | `gates()` in `index.html`: G0 evidence freshness, G1 reset validity, G2 task validity, G3 outcome validity, G4 training signal, G5 full grader coverage (rules v2) |
| Collection rule | `buildCollection()`: per task, the newest version that is accepted **and** still passes current gates; out-of-scope pools excluded with a reason |
| Seed data | `SEED` in `index.html`: the four supplied records (A01–D01) with extended fields, plus B02 added for Task 3 |

## Verification

- In-app self-checks: 19/19 pass.
- `tests/walkthrough.mjs` drives the real UI in headless Chromium and checks 16 assertions, including the before/after collections. All 16 pass. To run it: `npm i playwright && node tests/walkthrough.mjs`. Screenshots are in `tests/screens/`.

## Limitations

- Graders are modelled as metadata (what they check and which success clauses they cover), not as executable reward functions. The existing runner executes graders, and Pass/Fail comes from supplied run evidence. A next step is executable clause checks over a recorded final state, so coverage (G5) is derived instead of ticked by hand.
- State is in memory and resets on refresh. Evidence is entered by hand in place of the runner.
- Evidence covers one run per version. Pass rates across attempts, reviewer agreement, and the customer feedback loop are not modelled.
- There is no auth, and reviewer names are free text.
