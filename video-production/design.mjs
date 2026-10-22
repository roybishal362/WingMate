// Generates the launch-video design assets: framed backgrounds per feature, a rounded mask,
// and animated intro / chapter / outro cards (recorded from HTML+CSS at 1920x1080).
import { chromium } from "playwright-core";
import fs from "fs";

fs.mkdirSync("frames", { recursive: true });
fs.mkdirSync("cards", { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;600;800&display=block" rel="stylesheet">`;
const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1920px;height:1080px;overflow:hidden;background:#0c0a0e;color:#f4ede6;font-family:Inter,sans-serif}
.bg{position:absolute;inset:0;background:
 radial-gradient(1100px 650px at 12% -8%, rgba(255,92,124,.22), transparent 60%),
 radial-gradient(900px 600px at 105% 10%, rgba(233,194,125,.16), transparent 60%),
 radial-gradient(800px 500px at 50% 120%, rgba(124,196,255,.10), transparent 60%), #0c0a0e}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:64px 64px;mask-image:radial-gradient(ellipse at center,black 30%,transparent 75%)}
.serif{font-family:Fraunces,Georgia,serif;letter-spacing:-.02em}
.rose{color:#ff5c7c}.gold{color:#e9c27d}.muted{color:#a79ca8}
`;

// Window geometry (must match compose2.mjs)
const WIN = { x: 272, y: 226, w: 1376, h: 774, bar: 44 };

const SCENES = {
  s1_home: { k: "THE POOL", h: "28 real people. <span class='rose'>Each one has an agent.</span>", s: "Every agent knows exactly two things about its person: a LinkedIn and a public Instagram.", url: "wing-mate-seven.vercel.app/demo" },
  s2_live: { k: "01 · PASTE TWO LINKS", h: "Paste two links. <span class='rose'>Watch the agent go.</span>", s: "Apify scrapes both  →  the agent reads  →  swipes  →  goes on 3 dates, live.", url: "wing-mate-seven.vercel.app/add/thisisbillgates" },
  s3_profile: { k: "02 · THE READING", h: "A profile <span class='rose'>written by the agent.</span>", s: "Needs, hobbies, interests, values, personality — every trait cites the post or role it came from.", url: "wing-mate-seven.vercel.app/p/thisisbillgates" },
  s4_date: { k: "03 · THE DATE", h: "Two agents. One date. <span class='rose'>Every turn their own.</span>", s: "Venue from shared interests · private notes to their human · interest meter · independent debriefs", url: "wing-mate-seven.vercel.app/dates/randi-x-vineeta" },
  s5_rank: { k: "04 · THE RANKING", h: "Who fits each person <span class='rose'>best.</span>", s: "Ranked by both agents' verdicts — a match only scores high when it's mutual.", url: "wing-mate-seven.vercel.app/p/thisisbillgates/ranking" },
};

function frameHtml(sc) {
  return `<html><head>${FONTS}<style>${BASE_CSS}
  .kick{position:absolute;left:${WIN.x}px;top:58px;font:800 15px Inter;letter-spacing:.28em;color:#ff5c7c;display:flex;align-items:center;gap:12px}
  .kick:before{content:"";width:28px;height:2px;background:#ff5c7c;display:block}
  .h{position:absolute;left:${WIN.x}px;top:88px;font-size:56px;font-weight:600;line-height:1.05;white-space:nowrap}
  .s{position:absolute;left:${WIN.x}px;top:160px;font-size:21px;color:#c9bfc8}
  .logo{position:absolute;right:${WIN.x}px;top:58px;display:flex;align-items:center;gap:10px;font:700 22px Fraunces,Georgia}
  .logo i{width:34px;height:34px;border-radius:10px;background:#ff5c7c;color:#0c0a0e;display:grid;place-items:center;font-style:normal;font-size:18px}
  .win{position:absolute;left:${WIN.x - 1}px;top:${WIN.y - 1}px;width:${WIN.w + 2}px;height:${WIN.h + WIN.bar + 2}px;border-radius:18px;border:1px solid rgba(255,255,255,.12);
       background:#0c0a0e;box-shadow:0 40px 120px rgba(0,0,0,.7),0 0 0 1px rgba(255,92,124,.08),0 0 90px rgba(255,92,124,.18)}
  .bar{height:${WIN.bar}px;border-radius:18px 18px 0 0;background:linear-gradient(#1f1925,#18131c);display:flex;align-items:center;padding:0 18px;gap:9px;border-bottom:1px solid rgba(255,255,255,.07)}
  .d{width:13px;height:13px;border-radius:50%}
  .url{margin:0 auto;transform:translateX(-30px);background:#0f0c12;border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:6px 18px;font:500 14px Inter;color:#a79ca8;min-width:520px;text-align:center}
  .url b{color:#7ee2a8;font-weight:600}
  </style></head><body><div class="bg"></div><div class="grid"></div>
  <div class="logo"><i>♥</i>Wingmate</div>
  <div class="kick">${sc.k}</div><div class="h serif">${sc.h}</div><div class="s">${sc.s}</div>
  <div class="win"><div class="bar"><span class="d" style="background:#ff5f57"></span><span class="d" style="background:#febc2e"></span><span class="d" style="background:#28c840"></span>
  <div class="url"><b>🔒</b> ${sc.url}</div></div></div></body></html>`;
}

const maskHtml = `<html><body style="margin:0;background:#000;width:${WIN.w}px;height:${WIN.h}px"><div style="width:${WIN.w}px;height:${WIN.h}px;background:#fff;border-radius:0 0 17px 17px"></div></body></html>`;

const intro = `<html><head>${FONTS}<style>${BASE_CSS}
.c{position:absolute;inset:0;display:grid;place-items:center;text-align:center}
.heart{width:120px;height:120px;border-radius:32px;background:#ff5c7c;color:#0c0a0e;display:grid;place-items:center;font-size:62px;margin:0 auto;
 animation:pop .9s cubic-bezier(.2,1.6,.4,1) both, glow 2.4s ease-in-out .9s infinite}
@keyframes pop{from{transform:scale(0) rotate(-20deg);opacity:0}to{transform:none;opacity:1}}
@keyframes glow{0%,100%{box-shadow:0 0 0 0 rgba(255,92,124,.0)}50%{box-shadow:0 0 80px 10px rgba(255,92,124,.45)}}
.t{font-size:150px;font-weight:700;margin-top:26px;animation:up .9s .45s cubic-bezier(.2,.9,.3,1) both}
.tag{font-size:40px;margin-top:10px;animation:up .9s .9s cubic-bezier(.2,.9,.3,1) both}
.chips{display:flex;gap:16px;justify-content:center;margin-top:46px}
.chip{font:600 22px Inter;padding:12px 22px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);opacity:0;animation:up .6s cubic-bezier(.2,.9,.3,1) both}
.arrow{font-size:26px;color:#a79ca8;align-self:center;opacity:0;animation:up .6s both}
@keyframes up{from{opacity:0;transform:translateY(40px);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}
</style></head><body><div class="bg"></div><div class="grid"></div><div class="c"><div>
<div class="heart">♥</div><div class="t serif">Wingmate</div>
<div class="tag serif muted">Your agent goes on the dates. <span class="rose">You meet the right one.</span></div>
<div class="chips">
<span class="chip" style="animation-delay:1.5s">LinkedIn + Instagram</span><span class="arrow" style="animation-delay:1.7s">→</span>
<span class="chip" style="animation-delay:1.9s">An agent reads you</span><span class="arrow" style="animation-delay:2.1s">→</span>
<span class="chip" style="animation-delay:2.3s">Agents go on dates</span><span class="arrow" style="animation-delay:2.5s">→</span>
<span class="chip rose" style="animation-delay:2.7s;border-color:rgba(255,92,124,.5)">Who fits you best</span></div>
</div></div></body></html>`;

const chapter = (n, title, sub) => `<html><head>${FONTS}<style>${BASE_CSS}
.c{position:absolute;left:300px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center}
.n{font-size:220px;font-weight:700;line-height:.9;background:linear-gradient(120deg,#ff5c7c,#e9c27d);-webkit-background-clip:text;color:transparent;animation:in .7s cubic-bezier(.2,.9,.3,1) both}
.line{height:4px;background:#ff5c7c;border-radius:4px;margin:28px 0 26px;animation:grow .8s .15s cubic-bezier(.2,.9,.3,1) both}
.tt{font-size:84px;font-weight:600;animation:in .7s .2s cubic-bezier(.2,.9,.3,1) both}
.sb{font-size:30px;margin-top:14px;animation:in .7s .35s cubic-bezier(.2,.9,.3,1) both}
@keyframes in{from{opacity:0;transform:translateX(-60px);filter:blur(10px)}to{opacity:1;transform:none;filter:none}}
@keyframes grow{from{width:0}to{width:420px}}
</style></head><body><div class="bg"></div><div class="grid"></div><div class="c">
<div class="n serif">${n}</div><div class="line"></div><div class="tt serif">${title}</div><div class="sb muted">${sub}</div></div></body></html>`;

const outro = `<html><head>${FONTS}<style>${BASE_CSS}
.c{position:absolute;inset:0;display:grid;place-items:center;text-align:center}
.stats{display:flex;gap:70px;justify-content:center}
.st{animation:up .8s cubic-bezier(.2,.9,.3,1) both}.st b{display:block;font:700 110px Fraunces,Georgia;color:#ff5c7c;line-height:1}.st span{font-size:24px;color:#a79ca8}
.stack{display:flex;gap:14px;justify-content:center;margin-top:60px}
.p{font:600 22px Inter;padding:12px 22px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);animation:up .6s cubic-bezier(.2,.9,.3,1) both}
.brand{margin-top:70px;animation:up .8s 3.2s both}.brand .t{font:700 84px Fraunces,Georgia}
.links{margin-top:14px;font-size:26px;color:#c9bfc8;animation:up .8s 3.6s both}
@keyframes up{from{opacity:0;transform:translateY(40px);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}
</style></head><body><div class="bg"></div><div class="grid"></div><div class="c"><div>
<div class="stats"><div class="st" style="animation-delay:.1s"><b>28</b><span>real people</span></div><div class="st" style="animation-delay:.35s"><b>53</b><span>agent dates</span></div><div class="st" style="animation-delay:.6s"><b>707</b><span>swipes</span></div><div class="st" style="animation-delay:.85s"><b>28</b><span>rankings</span></div></div>
<div class="stack"><span class="p" style="animation-delay:1.3s">Next.js 15</span><span class="p" style="animation-delay:1.5s">Apify</span><span class="p" style="animation-delay:1.7s">Gemini + Groq (free tiers)</span><span class="p" style="animation-delay:1.9s">Upstash Redis</span><span class="p" style="animation-delay:2.1s">Vercel</span></div>
<div class="brand"><div class="t">♥ Wingmate</div></div>
<div class="links">wing-mate-seven.vercel.app &nbsp;·&nbsp; github.com/roybishal362/WingMate</div>
</div></div></body></html>`;

const browser = await chromium.launch({ channel: "msedge", headless: true });

// static frames
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  for (const [name, sc] of Object.entries(SCENES)) {
    await page.setContent(frameHtml(sc), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `frames/${name}.png` });
  }
  await page.setViewportSize({ width: WIN.w, height: WIN.h });
  await page.setContent(maskHtml);
  await page.screenshot({ path: "frames/mask.png" });
  await ctx.close();
}

async function record(name, html, ms) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: "cards", size: { width: 1920, height: 1080 } } });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });
  await sleep(ms);
  const v = page.video();
  await ctx.close();
  fs.renameSync(await v.path(), `cards/${name}.webm`);
  console.log("card", name);
}
await record("intro", intro, 7000);
await record("c1", chapter("01", "Paste two links", "LinkedIn + public Instagram, scraped by Apify"), 2600);
await record("c2", chapter("02", "The agent reads its person", "An evidence-backed profile from two sources"), 2600);
await record("c3", chapter("03", "The agents go on dates", "Turn by turn, on their person's behalf"), 2600);
await record("c4", chapter("04", "Everyone gets a ranking", "Mutual verdicts decide who fits best"), 2600);
await record("outro", outro, 12500);
await browser.close();
console.log("done");
