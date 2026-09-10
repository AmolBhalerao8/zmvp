import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const work = path.join(root, "work");
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
      const availableBytes = buffer.length - (offset + 8);
      const audioBytes = size > availableBytes ? availableBytes : size;
      return Math.round((audioBytes / byteRate) * 1000);
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error(`Invalid WAV file: ${file}`);
}

const card = (eyebrow, title, body, closing = false) => `<!doctype html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;width:100vw;height:100vh;overflow:hidden;background:#102b29;color:white;font-family:Arial,sans-serif}
.orb{position:absolute;width:760px;height:760px;border-radius:50%;right:-180px;top:-280px;border:1px solid rgba(64,216,189,.2);background:rgba(64,216,189,.045)}
.wrap{position:relative;height:100%;padding:90px 110px;display:flex;flex-direction:column;justify-content:${closing ? "center" : "space-between"}}
.brand{display:flex;align-items:center;gap:18px;font-size:27px;font-weight:900}.logo{display:grid;place-items:center;width:58px;height:58px;border-radius:16px;background:#21c3a7;color:#102b29}
.content{max-width:1220px}.eyebrow{color:#64e4cd;text-transform:uppercase;letter-spacing:.22em;font-size:17px;font-weight:800}
h1{font-size:${closing ? "78px" : "76px"};letter-spacing:-.045em;line-height:1.04;margin:25px 0 24px}
p{max-width:950px;font-size:27px;line-height:1.55;color:rgba(255,255,255,.67);margin:0}
.footer{display:flex;justify-content:space-between;color:rgba(255,255,255,.42);font-size:17px}
</style></head><body><div class="orb"></div><main class="wrap">
${closing ? "" : '<div class="brand"><span class="logo">Z</span><span>ZOL</span></div>'}
<div class="content"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${body}</p></div>
${closing ? "" : '<div class="footer"><span>AI-powered automotive shop operations</span><span>Advisory Board Demo</span></div>'}
</main></body></html>`;

const browser = await chromium.launch({ headless: true });

// Authenticate before recording so the final video starts cleanly on the title card.
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
await page.addStyleTag({ content: "nextjs-portal{display:none!important} *{scrollbar-width:none!important}" }).catch(() => {});

const timeline = [];
const startedAt = Date.now();
const duration = (number) => {
  const scene = scenes.find((item) => item.number === number);
  return wavDurationMs(path.join(root, scene.audio.replaceAll("/", path.sep)));
};
console.log(
  `Narration duration: ${Math.round(scenes.reduce((total, scene) => total + duration(scene.number), 0) / 1000)} seconds.`,
);
const mark = (scene) => {
  timeline.push({
    ...scene,
    startMs: Date.now() - startedAt,
    durationMs: duration(scene.number),
  });
};
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const settle = async () => {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
};

await page.setContent(card("Meet ZOL", "The connected operating system for automotive repair shops.", "One workflow from the first customer conversation to payment and long-term care."));
mark(scenes[0]);
await pause(duration("01") + 900);

await page.goto(`${baseURL}/`);
await settle();
mark(scenes[1]);
await pause(Math.round(duration("02") * 0.58));
await page.evaluate(() => window.scrollTo({ top: 560, behavior: "smooth" }));
await pause(Math.round(duration("02") * 0.42) + 700);

await page.goto(`${baseURL}/appointments`);
await settle();
mark(scenes[2]);
await pause(Math.round(duration("03") * 0.55));
await page.evaluate(() => window.scrollTo({ top: 480, behavior: "smooth" }));
await pause(Math.round(duration("03") * 0.45) + 700);

await page.goto(`${baseURL}/repair-orders`);
await settle();
const sonicHref = await page.getByRole("link", { name: "RO-1048" }).getAttribute("href");
await page.goto(`${baseURL}${sonicHref}`);
await settle();
mark(scenes[3]);
await pause(Math.round(duration("04") * 0.28));
await page.evaluate(() => window.scrollTo({ top: 520, behavior: "smooth" }));
await pause(Math.round(duration("04") * 0.34));
await page.evaluate(() => window.scrollTo({ top: 1280, behavior: "smooth" }));
await pause(Math.round(duration("04") * 0.38) + 700);

await page.goto(`${baseURL}/estimates`);
await settle();
const estimateRow = page.getByRole("row").filter({ hasText: "EST-2047" });
const portalHref = await estimateRow.getByRole("link", { name: /open/i }).getAttribute("href");
await page.goto(`${baseURL}${portalHref}`);
await settle();
mark(scenes[4]);
await pause(Math.round(duration("05") * 0.5));
await page.evaluate(() => window.scrollTo({ top: 820, behavior: "smooth" }));
await pause(Math.round(duration("05") * 0.5) + 700);

await page.goto(`${baseURL}/parts`);
await settle();
mark(scenes[5]);
await pause(Math.round(duration("06") * 0.48));
await page.goto(`${baseURL}/technicians`);
await settle();
await pause(Math.round(duration("06") * 0.52) + 700);

await page.goto(`${baseURL}/invoices`);
await settle();
mark(scenes[6]);
await pause(Math.round(duration("07") * 0.42));
await page.goto(`${baseURL}/payments`);
await settle();
await pause(Math.round(duration("07") * 0.25));
await page.goto(`${baseURL}/crm`);
await settle();
await pause(Math.round(duration("07") * 0.33) + 700);

await page.goto(`${baseURL}/assistant?q=${encodeURIComponent("Which technicians have the highest workload?")}`);
await settle();
mark(scenes[7]);
await pause(Math.round(duration("08") * 0.64));
await page.setContent(card("One connected ecosystem", "A stronger shop. A clearer customer experience.", "ZOL connects customer, vehicle, repair, payment, and retention in one intelligent workflow.", true));
await pause(Math.round(duration("08") * 0.36) + 1200);

const video = page.video();
await context.close();
const recordedPath = await video.path();
fs.copyFileSync(recordedPath, path.join(work, "capture.webm"));
fs.writeFileSync(path.join(work, "timeline.json"), JSON.stringify(timeline, null, 2));
await browser.close();

console.log(`Captured ${timeline.length} scenes to demo-video/work/capture.webm`);
