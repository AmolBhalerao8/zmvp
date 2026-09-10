import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const work = path.join(root, "work-full");
const captureDir = path.join(work, "capture");
const baseURL = process.env.ZOL_DEMO_URL || "http://localhost:3000";
const scenes = JSON.parse(fs.readFileSync(path.join(work, "scenes.json"), "utf8").replace(/^\uFEFF/, ""));
fs.mkdirSync(captureDir, { recursive: true });

function wavDurationMs(file) {
  const buffer = fs.readFileSync(file);
  const byteRate = buffer.readUInt32LE(28);
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunk = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (chunk === "data") {
      const available = buffer.length - (offset + 8);
      return Math.round((Math.min(size, available) / byteRate) * 1000);
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error(`Invalid WAV file: ${file}`);
}

const card = (eyebrow, title, body, closing = false) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;width:100vw;height:100vh;overflow:hidden;background:#102b29;color:white;font-family:Arial,sans-serif}
.orb{position:absolute;width:820px;height:820px;border-radius:50%;right:-180px;top:-300px;border:1px solid rgba(64,216,189,.2);background:rgba(64,216,189,.045)}
.wrap{position:relative;height:100%;padding:90px 110px;display:flex;flex-direction:column;justify-content:${closing ? "center" : "space-between"}}
.brand{display:flex;align-items:center;gap:18px;font-size:27px;font-weight:900}.logo{display:grid;place-items:center;width:58px;height:58px;border-radius:16px;background:#21c3a7;color:#102b29}
.content{max-width:1240px}.eyebrow{color:#64e4cd;text-transform:uppercase;letter-spacing:.22em;font-size:17px;font-weight:800}
h1{font-size:76px;letter-spacing:-.045em;line-height:1.04;margin:25px 0 24px}p{max-width:1020px;font-size:27px;line-height:1.55;color:rgba(255,255,255,.67);margin:0}
.footer{display:flex;justify-content:space-between;color:rgba(255,255,255,.42);font-size:17px}
</style></head><body><div class="orb"></div><main class="wrap">${closing ? "" : '<div class="brand"><span class="logo">Z</span><span>ZOL</span></div>'}
<div class="content"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${body}</p></div>
${closing ? "" : '<div class="footer"><span>Complete AI-powered shop workflow</span><span>Product Vision Demo</span></div>'}</main></body></html>`;

const duration = (number) => {
  const scene = scenes.find((item) => item.number === number);
  return wavDurationMs(path.join(root, scene.audio.replaceAll("/", path.sep)));
};
console.log(`Full narration duration: ${Math.round(scenes.reduce((sum, scene) => sum + duration(scene.number), 0) / 1000)} seconds.`);

const browser = await chromium.launch({ headless: true });
const authContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const authPage = await authContext.newPage();
await authPage.goto(`${baseURL}/login`, { waitUntil: "networkidle" });
await authPage.locator('input[name="email"]').fill("owner@zol.demo");
await authPage.locator('input[name="password"]').fill("ZolDemo123!");
await authPage.getByRole("button", { name: /sign in/i }).click();
await authPage.waitForURL(`${baseURL}/`, { timeout: 30000 });
const storageState = await authContext.storageState();
await authContext.close();

const context = await browser.newContext({
  storageState,
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: captureDir, size: { width: 1920, height: 1080 } },
});
const page = await context.newPage();
const startedAt = Date.now();
const timeline = [];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const mark = (scene) => timeline.push({ ...scene, startMs: Date.now() - startedAt, durationMs: duration(scene.number) });
const settle = async () => {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.addStyleTag({ content: "nextjs-portal{display:none!important} *{scrollbar-width:none!important}" }).catch(() => {});
};
const go = async (route) => { await page.goto(`${baseURL}${route}`); await settle(); };
const hold = async (number, padding = 700) => pause(duration(number) + padding);
const splitHold = async (number, ratio) => pause(Math.round(duration(number) * ratio));

await page.setContent(card("Complete Product Vision", "From the first customer call to lifelong service relationships.", "See how ZOL connects AI reception, CRM, scheduling, shop operations, customer communication, payment, and retention."));
mark(scenes[0]); await hold("01", 1000);

await go("/calls");
mark(scenes[1]); await splitHold("02", 0.42);
const callHref = await page.locator('a[href^="/calls/"]').first().getAttribute("href");
await go(callHref);
await splitHold("02", 0.58); await pause(700);

mark(scenes[2]); await splitHold("03", 0.38);
await page.evaluate(() => window.scrollTo({ top: 640, behavior: "smooth" }));
await splitHold("03", 0.34);
await page.evaluate(() => window.scrollTo({ top: 1200, behavior: "smooth" }));
await splitHold("03", 0.28); await pause(700);

await page.evaluate(() => window.scrollTo({ top: 1450, behavior: "smooth" }));
mark(scenes[3]); await splitHold("04", 0.5);
await go("/messages");
await splitHold("04", 0.5); await pause(700);

await go("/");
mark(scenes[4]); await splitHold("05", 0.48);
await go("/appointments");
await splitHold("05", 0.52); await pause(700);

await go("/customers");
mark(scenes[5]); await splitHold("06", 0.23);
const customerHref = await page.getByRole("link", { name: "Jordan Lee" }).first().getAttribute("href");
await go(customerHref); await splitHold("06", 0.27);
await go("/vehicles"); await splitHold("06", 0.22);
await go(`/search?q=${encodeURIComponent("2015 Sonic")}`); await splitHold("06", 0.28); await pause(700);

await go("/repair-orders");
const roHref = await page.getByRole("link", { name: "RO-1048" }).getAttribute("href");
await go(roHref);
mark(scenes[6]); await splitHold("07", 0.34);
await page.evaluate(() => window.scrollTo({ top: 520, behavior: "smooth" })); await splitHold("07", 0.38);
await page.evaluate(() => window.scrollTo({ top: 1050, behavior: "smooth" })); await splitHold("07", 0.28); await pause(700);

await go("/inspections");
mark(scenes[7]); await splitHold("08", 0.36);
await go(roHref); await page.evaluate(() => window.scrollTo({ top: 1400, behavior: "smooth" }));
await splitHold("08", 0.64); await pause(700);

await go("/estimates");
mark(scenes[8]); await splitHold("09", 0.38);
const estimateRow = page.getByRole("row").filter({ hasText: "EST-2047" });
const portalHref = await estimateRow.getByRole("link", { name: /open/i }).getAttribute("href");
await go(portalHref); await splitHold("09", 0.3);
await page.evaluate(() => window.scrollTo({ top: 820, behavior: "smooth" })); await splitHold("09", 0.32); await pause(700);

await go("/parts");
mark(scenes[9]); await splitHold("10", 0.34);
await go("/technicians"); await splitHold("10", 0.34);
await go("/messages"); await splitHold("10", 0.32); await pause(700);

await go("/invoices");
mark(scenes[10]); await splitHold("11", 0.34);
await go("/payments"); await splitHold("11", 0.28);
await go("/customer").catch(() => {});
if (page.url().includes("/login") || page.url() === `${baseURL}/`) await go("/portal/estimate/" + portalHref.split("/").at(-1));
await splitHold("11", 0.38); await pause(700);

await go("/crm");
mark(scenes[11]); await splitHold("12", 0.32);
await go(`/assistant?q=${encodeURIComponent("Which vehicles are waiting for customer approval?")}`); await splitHold("12", 0.32);
await go("/settings"); await splitHold("12", 0.18);
await page.setContent(card("One connected ZOL ecosystem", "Answer faster. Communicate clearly. Operate intelligently.", "Customer, vehicle, appointment, repair, payment, and retention — working together.", true));
await splitHold("12", 0.18); await pause(1400);

const video = page.video();
await context.close();
fs.copyFileSync(await video.path(), path.join(work, "capture.webm"));
fs.writeFileSync(path.join(work, "timeline.json"), JSON.stringify(timeline, null, 2));
await browser.close();
console.log(`Captured ${timeline.length} full-demo scenes.`);
