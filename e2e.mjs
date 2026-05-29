// End-to-end browser test of the full SigmaSkribbl flow.
// Drives two browser contexts (host + guest) through: create room → join →
// start → choose word → draw-phase → correct guess. Captures all console
// errors and page exceptions so client-side bugs surface.
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const errors = [];
let failures = 0;
const check = (cond, label) => {
  console.log(`${cond ? "✓" : "✗"} ${label}`);
  if (!cond) failures++;
};

function watch(page, who) {
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`[${who} console.error] ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`[${who} pageerror] ${e.message}`));
  page.on("requestfailed", (r) => {
    const f = r.failure();
    // ignore favicon noise
    if (!r.url().includes("favicon")) errors.push(`[${who} reqfailed] ${r.url()} ${f?.errorText}`);
  });
}

const browser = await chromium.launch();
try {
  const hostCtx = await browser.newContext();
  const guestCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();
  watch(host, "host");
  watch(guest, "guest");

  // --- HOST: create a room ---
  await host.goto(BASE, { waitUntil: "networkidle" });
  await host.getByPlaceholder("e.g. Antonio").fill("Alice");
  await host.getByRole("button", { name: "Create a private room" }).click();

  await host.waitForURL(/\/room\/.+/, { timeout: 10000 }).catch(() => {});
  const url = host.url();
  check(/\/room\/[a-z0-9]+/.test(url), `host navigated to a room (${url.split("/").pop()})`);
  const code = url.split("/").pop();

  // Lobby should render (room code visible).
  await host.waitForSelector("text=Room code", { timeout: 10000 }).catch(() => {});
  check(await host.locator("text=Room code").isVisible().catch(() => false), "host sees lobby");

  // --- GUEST: join the same room ---
  await guest.goto(`${BASE}/room/${code}`, { waitUntil: "networkidle" });
  // Nickname gate
  await guest.getByPlaceholder("Your nickname").fill("Bob");
  await guest.getByRole("button", { name: "Join" }).click();

  // Both should now show 2 players.
  await host.waitForFunction(() => document.body.innerText.includes("Players · 2"), null, { timeout: 10000 }).catch(() => {});
  check(await host.locator("text=Players · 2").isVisible().catch(() => false), "host sees 2 players");
  check(await guest.locator("text=Bob").first().isVisible().catch(() => false), "guest is in the room");

  // --- diagnostics: who does each side think is host? ---
  const hostCrown = await host.locator("text=👑").count();
  console.log(`   [diag] host page: isHost-crown count=${hostCrown}, startBtn=${await host.getByRole("button", { name: /Start game/ }).count()}, waitingMsg=${await host.locator("text=Waiting for the host").count()}`);

  // --- HOST: start the game ---
  await host.getByRole("button", { name: /Start game/ }).click();

  // One of the two becomes the drawer and sees the word picker.
  await host.waitForTimeout(2000);
  const errToast = (await host.locator("div.fixed.bottom-4").textContent().catch(() => null)) ||
    (await guest.locator("div.fixed.bottom-4").textContent().catch(() => null));
  console.log(`   [diag] after start: errorToast=${JSON.stringify(errToast)}`);
  console.log(`   [diag] host body has 'Choose'/'choosing': ${(await host.locator("body").innerText()).includes("hoos")}`);
  console.log(`   [diag] guest body has 'choosing': ${(await guest.locator("body").innerText()).includes("hoos")}`);
  const hostPicker = await host.locator("text=Pick a word to draw").isVisible().catch(() => false);
  const guestPicker = await guest.locator("text=Pick a word to draw").isVisible().catch(() => false);
  check(hostPicker || guestPicker, "a drawer got the word picker");

  const drawer = hostPicker ? host : guest;
  const guesser = hostPicker ? guest : host;

  // Read the first offered word, then pick it.
  const wordBtn = drawer.locator("div.absolute button").first();
  const chosen = (await wordBtn.innerText()).trim();
  check(!!chosen, `drawer offered word "${chosen}"`);
  await wordBtn.click();

  // Drawing phase: timer + letter hint should appear for the guesser.
  await guesser.waitForTimeout(1000);
  check(
    await guesser.locator("text=letters").isVisible().catch(() => false),
    "guesser sees the letter-count hint",
  );

  // Guesser submits the correct word.
  await guesser.getByPlaceholder(/guess/i).fill(chosen);
  await guesser.getByRole("button", { name: "Send" }).click();

  // Correct-guess banner should appear in chat.
  await guesser.waitForFunction(
    () => document.body.innerText.toLowerCase().includes("guessed the word"),
    null,
    { timeout: 6000 },
  ).catch(() => {});
  check(
    await guesser.locator("text=guessed the word").first().isVisible().catch(() => false),
    "correct guess detected & broadcast",
  );

  // The drawer's secret word must never appear in the guesser's DOM before reveal.
  // (At this point the turn may be ending; just sanity-check no crash happened.)
} catch (e) {
  console.error("TEST THREW:", e);
  failures++;
} finally {
  await browser.close();
}

if (errors.length) {
  console.log("\n--- captured console/page errors ---");
  for (const e of errors) console.log(e);
}
console.log(`\n${failures === 0 && errors.length === 0 ? "ALL PASSED ✅" : `${failures} failed check(s), ${errors.length} runtime error(s)`}`);
process.exit(failures === 0 && errors.length === 0 ? 0 : 1);
