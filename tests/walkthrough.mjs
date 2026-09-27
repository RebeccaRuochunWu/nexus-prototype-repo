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
const openTask = id => page.click(`.tasklist button[data-id="${id}"]`);
const review = async (act, reason) => { await page.fill("#rvReason", reason); await page.click(`[data-act="${act}"]`); };
const flashText = () => page.locator(".okmsg, .err").first().innerText().catch(() => "");
const shot = n => page.screenshot({ path: `tests/screens/${n}.png`, fullPage: true });

// 1. Built-in self-checks
await page.click('[data-act="view"][data-v="checks"]');
await page.click('[data-act="runChecks"]');
const summary = await page.locator("p b").innerText();
ok(`Self-checks all pass (${summary})`, /^(\d+)\/\1 passed$/.test(summary));

// 2. Accepted path: B01 useful model failure
await page.click('[data-act="view"][data-v="tasks"]');
await openTask("B01");
ok("B01 accept button enabled (all gates pass)", await page.isEnabled('[data-act="accept"]'));
await review("accept", "Genuine model failure: picked cheaper Vale, ignored the April 20 arrival constraint. State grader correct.");
ok("B01@v1 accepted", /B01@v1 accepted/.test(await flashText()));
await shot("1-b01-accepted");

// 3. Return → edit → re-review: C01 broken reset
await openTask("C01");
ok("C01 accept disabled (reset/task validity fail)", !(await page.isEnabled('[data-act="accept"]')));
await review("return", "Reset invalid: snapshot-17 missing after reset; no reference run. Fix manifest and re-run.");
ok("C01@v1 returned", /returned for revision/.test(await flashText()));
await page.click('[data-act="edit"]');
await page.fill("#edInit", "The reset manifest restores snapshot-17; the file is verified present after every reset.");
await page.fill("#edNote", "Fix reset manifest so snapshot-17 exists");
await page.click('[data-act="saveVer"]');
ok("C01@v2 created", /Saved C01@v2/.test(await flashText()));
ok("C01@v2 accept blocked until evidence re-recorded (G0)", !(await page.isEnabled('[data-act="accept"]')));
await page.selectOption("#evCause", "model");
await page.selectOption("#evOutcome", "agrees");
await page.check("#evReset"); await page.check("#evRef");
await page.fill("#evRun", "Restore succeeded. Agent reran the job but closed the incident without checking the output file.");
await page.fill("#evRefTxt", "Expert solved v2 end to end after the reset fix.");
await page.click('[data-act="saveEv"]');
ok("C01@v2 accept enabled after re-run evidence", await page.isEnabled('[data-act="accept"]'));
await review("accept", "Reset fixed; model skipped output verification before closing: real failure.");
ok("C01@v2 accepted", /C01@v2 accepted/.test(await flashText()));
await shot("2-c01-v2-accepted");

// 4. D01 false pass cannot be accepted
await openTask("D01");
ok("D01 accept disabled (message grader, outcome disagrees)", !(await page.isEnabled('[data-act="accept"]')));

// 5. Rules v1: accept B02, build collection
await openTask("B02");
await review("accept", "Verified pass: vendor, seats, and total confirmed in final state.");
await page.click('[data-act="view"][data-v="collections"]');
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

// 7. Fix B02 grader → v2 → re-review → ships
await page.click('[data-act="view"][data-v="tasks"]');
await openTask("B02");
ok("B02@v1 now shows G5 failing", /Not checked by grader/.test(await page.locator(".panel").nth(3).innerText()));
await page.click('[data-act="edit"]');
await page.check('.edCover[value="3"]');
await page.fill("#edGDesc", "Reads vendor, seats, total, and quote link.");
await page.fill("#edNote", "Grader now checks quote link");
await page.click('[data-act="saveVer"]');
await page.selectOption("#evResult", "Fail"); await page.selectOption("#evCause", "model");
await page.fill("#evRun", "Re-run under full grader: agent omitted the quote link; grader now fails it.");
await page.click('[data-act="saveEv"]');
await review("accept", "Full-coverage grader catches the missing quote link: real model failure.");
await page.click('[data-act="view"][data-v="collections"]');
await page.click('[data-act="build"]');
const col3 = await flashText();
ok(`Collection after fix pins B02@v2  [${col3}]`, /B02@v2/.test(col3));
await shot("4-b02-v2-ships");

ok("No page errors", errors.length === 0);
await browser.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} UI checks passed`);
process.exit(failed ? 1 : 0);
