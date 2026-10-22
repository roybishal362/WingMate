// Records each scene of the demo video from the real deployed site (headless Edge).
import { chromium } from "playwright-core";
import fs from "fs";

const BASE = process.env.BASE || "https://wing-mate-seven.vercel.app";
const LI = process.env.LI || "https://www.linkedin.com/in/williamhgates/";
const IG = process.env.IG || "https://www.instagram.com/thisisbillgates/";
const DEMO_DATE = process.env.DEMO_DATE || "d-randi-zuck-vineeta-si-vltx";
const OUT = "clips";
fs.mkdirSync(OUT, { recursive: true });
const only = process.argv[2]; // optional: record a single scene
const meta = fs.existsSync("meta.json") ? JSON.parse(fs.readFileSync("meta.json", "utf8")) : {};

const browser = await chromium.launch({ channel: "msedge", headless: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function scene(name, fn) {
  if (only && only !== name) return;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, recordVideo: { dir: OUT, size: { width: 1280, height: 720 } } });
  const page = await ctx.newPage();
  const t = Date.now();
  try {
    await fn(page);
  } finally {
    const v = page.video();
    await ctx.close();
    const p = await v.path();
    fs.renameSync(p, `${OUT}/${name}.webm`);
    console.log(`${name}: ${((Date.now() - t) / 1000).toFixed(1)}s`);
  }
}

async function smoothScroll(page, total, ms) {
  const steps = Math.max(1, Math.round(ms / 50));
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, total / steps);
    await sleep(50);
  }
}

async function title(page, big, small) {
  await page.setContent(`<html><body style="margin:0;height:100vh;display:grid;place-items:center;background:radial-gradient(900px 500px at 20% 0%,rgba(255,92,124,.18),transparent 60%),#0c0a0e;color:#f4ede6;font-family:Georgia,serif">
  <div style="text-align:center"><div style="font-size:26px;color:#ff5c7c;letter-spacing:.3em;font-family:Segoe UI,sans-serif">♥ WINGMATE</div>
  <div style="font-size:64px;margin-top:18px;max-width:1050px;line-height:1.1">${big}</div>
  <div style="font-size:24px;margin-top:22px;color:#a79ca8;font-family:Segoe UI,sans-serif">${small}</div></div></body></html>`);
  await sleep(5200);
}

await scene("s0_title", (p) => title(p, "Your agent goes on the dates.<br/>You meet the right one.", "An agentic dating site · LinkedIn + Instagram via Apify · agents that date for you"));

await scene("s1_home", async (page) => {
  await page.goto(BASE + "/demo", { waitUntil: "networkidle" });
  await sleep(2500);
  await smoothScroll(page, 900, 4500);
  await sleep(1500);
  await smoothScroll(page, 1400, 5000);
  await sleep(1500);
});

await scene("s2_live", async (page) => {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await sleep(1500);
  await page.locator('input[placeholder*="linkedin"]').pressSequentially(LI, { delay: 18 });
  await page.locator('input[placeholder*="instagram"]').pressSequentially(IG, { delay: 18 });
  await sleep(800);
  await page.locator('button:has-text("Create their agent")').click();
  await page.waitForURL(/\/add\//, { timeout: 60000 });
  meta.liveId = page.url().split("/add/")[1];
  fs.writeFileSync("meta.json", JSON.stringify(meta));
  console.log("live id", meta.liveId);
  const deadline = Date.now() + 9 * 60_000;
  let scrolled = false;
  while (Date.now() < deadline) {
    if (await page.locator('a:has-text("ranking →")').count()) break;
    if (!scrolled && (await page.locator('h2:has-text("Dates happening now")').count())) {
      await page.locator('h2:has-text("Dates happening now")').scrollIntoViewIfNeeded();
      await smoothScroll(page, -120, 600);
      scrolled = true;
    }
    if (scrolled) {
      // follow the conversations as they grow
      await page.evaluate(() => document.querySelectorAll(".overflow-y-auto").forEach((el) => (el.scrollTop = el.scrollHeight)));
    }
    await sleep(1500);
  }
  await sleep(1500);
  await smoothScroll(page, 900, 2500);
  await sleep(2500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(2500);
});

await scene("s3_profile", async (page) => {
  const id = meta.liveId;
  await page.goto(`${BASE}/p/${id}`, { waitUntil: "networkidle" });
  await sleep(3000);
  await smoothScroll(page, 700, 5000);
  await sleep(2500);
  await smoothScroll(page, 700, 5000);
  await sleep(2500);
  await smoothScroll(page, 800, 5000);
  await sleep(2500);
  await smoothScroll(page, 900, 5000);
  await sleep(2000);
});

await scene("s4_date", async (page) => {
  await page.goto(`${BASE}/dates/${DEMO_DATE}?pool=demo`, { waitUntil: "networkidle" });
  await sleep(2500);
  for (let i = 0; i < 6; i++) {
    await sleep(2200);
    await smoothScroll(page, 170, 600);
  }
  await sleep(1500);
  await smoothScroll(page, 900, 3500);
  await sleep(3500);
  await smoothScroll(page, 600, 2500);
  await sleep(3000);
});

await scene("s5_rank", async (page) => {
  await page.goto(`${BASE}/p/${meta.liveId}/ranking`, { waitUntil: "networkidle" });
  await sleep(3500);
  await smoothScroll(page, 900, 5000);
  await sleep(1500);
  await page.goto(`${BASE}/rankings?pool=demo`, { waitUntil: "networkidle" });
  await sleep(3000);
  await smoothScroll(page, 800, 4500);
  await sleep(2000);
});

await scene("s6_end", async (page) => {
  await page.goto(`${BASE}/how`, { waitUntil: "networkidle" });
  await sleep(2000);
  await smoothScroll(page, 1200, 6000);
  await sleep(1000);
  await title(page, "28 real people. 53 agent dates.<br/>Every ranking.", "wing-mate-seven.vercel.app · github.com/roybishal362/WingMate");
});

await browser.close();
