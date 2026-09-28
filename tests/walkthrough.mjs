// Optional UI walkthrough: drives index.html in headless Chromium and asserts the core flows.
// Run: npm i playwright && node tests/walkthrough.mjs
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const file = "file://" + path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../index.html");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on("pageerror", e => errors.push(e.message));
await page.goto(file);
const results = [];
const ok = (name, cond) => { results.push({ name, ok: !!cond }); console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); };
const nav = v => page.click(`[data-act="view"][data-v="${v}"]`);
const openTask = id => page.click(`.tasklist button[data-id="${id}"]`);
const confirmCheck = () => page.click('[data-act="confirmCheck"]');
const decide = async (act, reason) => { await page.fill("#rvReason", reason); await page.click(`[data-act="${act}"]`); };
const flashText = () => page.locator(".okmsg, .err").first().innerText().catch(() => "");
const shot = n => page.screenshot({ path: `tests/screens/${n}.png`, fullPage: true });
const qcRow = id => page.locator("table tr", { has: page.locator(`td b:text-is("${id}")`) }).innerText();

// 0. Chronological order: nothing can ship before review
await nav("collections");
ok("Build is disabled before any task is accepted", !(await page.isEnabled('[data-act="build"]')));

// 1. Platform tests and task QC report are separate
await nav("checks");
await page.click('[data-act="runTests"]');
const summary = await page.locator("#testSummary").innerText();
ok(`Platform tests all pass (${summary})`, /^(\d+)\/\1 passed$/.test(summary));
ok("Task QC report shows C01 failing G1–G4", /FAIL \(G1, G2, G3, G4\)/.test(await qcRow("C01")));
ok("Task QC report shows D01 failing G2/G3/G4", /FAIL \(G2, G3, G4\)/.test(await qcRow("D01")));
await shot("0-qc-report-and-platform-tests");

// 2. Accepted path: B01 useful model failure
await nav("tasks");
await openTask("B01");
ok("B01 accept disabled while reviewer check is pending", !(await page.isEnabled('[data-act="accept"]')));
ok("B01 shows 'pending reviewer check'", (await page.content()).includes("pending reviewer check"));
await confirmCheck();
ok("B01 accept enabled after reviewer confirms", await page.isEnabled('[data-act="accept"]'));
await decide("accept", "Genuine model failure: picked cheaper Vale, ignored the April 20 arrival constraint. State grader correct.");
ok("B01@v1 accepted", /B01@v1 accepted/.test(await flashText()));
await shot("1-b01-accepted");

// 3. Return → edit → re-run → re-check → accept: C01 broken reset
await openTask("C01");
await confirmCheck();
ok("C01 accept disabled after check (G1/G2 fail)", !(await page.isEnabled('[data-act="accept"]')));
await decide("return", "Reset invalid: snapshot-17 missing after reset; no reference run. Fix manifest and re-run.");
ok("C01@v1 returned", /returned for revision/.test(await flashText()));
await page.click('[data-act="edit"]');
await page.fill("#edInit", "The reset manifest restores snapshot-17; the file is verified present after every reset.");
await page.fill("#edNote", "Fix reset manifest so snapshot-17 exists");
await page.click('[data-act="saveVer"]');
ok("C01@v2 created", /Saved C01@v2/.test(await flashText()));
ok("C01@v2 reviewer check is locked until re-run (G0)", (await page.locator('[data-act="confirmCheck"]').count()) === 0);
await page.selectOption("#runVerdict", "Fail");
await page.fill("#runTrace", "Restore succeeded. Agent reran the job but closed the incident without checking the output file.");
await page.click('[data-act="saveRun"]');
await page.selectOption("#ckCause", "model");
await page.selectOption("#ckOutcome", "agrees");
await page.check("#ckReset"); await page.check("#ckRef");
await page.fill("#ckRefTxt", "Expert solved v2 end to end after the reset fix.");
await confirmCheck();
ok("C01@v2 accept enabled after re-run + reviewer check", await page.isEnabled('[data-act="accept"]'));
await decide("accept", "Reset fixed; model skipped output verification before closing: real failure.");
ok("C01@v2 accepted", /C01@v2 accepted/.test(await flashText()));
await shot("2-c01-v2-accepted");

// 4. D01 false pass cannot be accepted
await openTask("D01");
await confirmCheck();
ok("D01 accept disabled (message grader, verdict disagrees with state)", !(await page.isEnabled('[data-act="accept"]')));

// 5. Rules v1: B02 shows a coverage warning, can be accepted, ships
await openTask("B02");
ok("B02 under v1 shows '⚠ not graded — allowed under rules v1'", (await page.content()).includes("allowed under rules v1"));
await confirmCheck();
await decide("accept", "Verified pass: vendor, seats, and total confirmed in final state.");
await nav("collections");
await page.click('[data-act="build"]');
const col1 = await flashText();
ok(`Collection under v1 = B01@v1, C01@v2, B02@v1  [${col1}]`, /B01@v1/.test(col1) && /C01@v2/.test(col1) && /B02@v1/.test(col1) && !/C01@v1/.test(col1) && !/A01/.test(col1));

// 6. Rules v2 (Task 3): B02 excluded
await page.selectOption("#rulesSel", "2");
await page.click('[data-act="build"]');
const col2 = await flashText();
ok(`Collection under v2 drops B02  [${col2}]`, /B01@v1/.test(col2) && /C01@v2/.test(col2) && !/B02/.test(col2));
const firstSnapshot = await page.locator(".panel h3").filter({ hasText: "COL-1" }).locator("..").innerText();
ok("COL-1 snapshot still lists B02@v1 (frozen)", /B02@v1/.test(firstSnapshot));
await shot("3-collections-v1-vs-v2");

// 7. Fix B02 grader → v2 → re-run → re-check → accept → ships
await nav("tasks");
await openTask("B02");
ok("B02@v1 under v2 shows G5 failing", (await page.content()).includes("blocks accept under rules v2"));
await page.click('[data-act="edit"]');
await page.check('.edCover[value="3"]');
await page.fill("#edGDesc", "Reads vendor, seats, total, and quote link.");
await page.fill("#edNote", "Grader now checks quote link");
await page.click('[data-act="saveVer"]');
await page.selectOption("#runVerdict", "Fail");
await page.fill("#runTrace", "Re-run under full grader: agent omitted the quote link; grader now fails it.");
await page.click('[data-act="saveRun"]');
await page.selectOption("#ckCause", "model");
await confirmCheck();
await decide("accept", "Full-coverage grader catches the missing quote link: real model failure.");
await nav("collections");
await page.click('[data-act="build"]');
const col3 = await flashText();
ok(`Collection after fix pins B02@v2  [${col3}]`, /B02@v2/.test(col3));
await shot("4-b02-v2-ships");

// 8. Storage model is a collapsible tree
await nav("data");
ok("Storage model renders as expandable tree", (await page.locator(".tree details").count()) > 10);
await shot("5-storage-tree");

ok("No page errors", errors.length === 0);
await browser.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} UI checks passed`);
process.exit(failed ? 1 : 0);
