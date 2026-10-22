import { chromium } from "playwright-core";
import fs from "fs";
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@700;800;900&family=Fraunces:opsz,wght@9..144,700&display=block" rel="stylesheet">`;
const common = `*{margin:0;padding:0;box-sizing:border-box}body{width:1280px;height:720px;overflow:hidden;background:#0b080d;font-family:Inter;color:#fff;position:relative}
.glow{position:absolute;inset:0;background:radial-gradient(700px 500px at 18% 30%,rgba(255,60,110,.55),transparent 60%),radial-gradient(600px 500px at 95% 90%,rgba(140,70,255,.45),transparent 60%),radial-gradient(500px 400px at 85% 5%,rgba(255,190,90,.25),transparent 60%)}
.ui{position:absolute;border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.8),0 0 0 2px rgba(255,255,255,.12),0 0 60px rgba(255,80,130,.45)}
.h{font-family:Anton,Impact,sans-serif;text-transform:uppercase;line-height:.92;letter-spacing:.5px;text-shadow:0 6px 0 rgba(0,0,0,.55),0 0 40px rgba(0,0,0,.6)}
.hl{background:#ff3d6e;color:#fff;padding:0 18px;border-radius:12px;display:inline-block;transform:rotate(-2deg);box-shadow:0 8px 0 #a3163d}
.bot{width:150px;height:150px;border-radius:50%;display:grid;place-items:center;font-size:84px;background:radial-gradient(circle at 35% 30%,#3a2a45,#160f1b);border:5px solid #fff;box-shadow:0 0 0 6px #ff3d6e,0 20px 50px rgba(0,0,0,.7)}
.sticker{position:absolute;font-family:Anton;background:#ffd23f;color:#111;border-radius:20px;padding:10px 26px;transform:rotate(8deg);box-shadow:0 10px 0 #b08900,0 20px 40px rgba(0,0,0,.6);text-align:center;line-height:1}`;
const A = `<html><head>${FONTS}<style>${common}</style></head><body><div class="glow"></div>
<img class="ui" src="ui-date.png" style="width:760px;right:-120px;top:120px;transform:perspective(1400px) rotateY(-22deg) rotateZ(4deg);opacity:.9">
<div style="position:absolute;inset:0;background:linear-gradient(90deg,#0b080d 30%,rgba(11,8,13,.55) 58%,rgba(11,8,13,.1))"></div>
<div style="position:absolute;left:56px;top:46px;display:flex;align-items:center;gap:12px;font:800 30px Fraunces"><span style="width:50px;height:50px;border-radius:14px;background:#ff3d6e;display:grid;place-items:center;font-size:26px">♥</span>Wingmate</div>
<div class="h" style="position:absolute;left:56px;top:130px;font-size:128px">AI agents<br><span class="hl">date</span> for you</div>
<div style="position:absolute;left:60px;bottom:52px;display:flex;gap:12px;font:900 26px Inter">
<span style="padding:12px 20px;border-radius:14px;background:#0a66c2">LinkedIn</span><span style="padding:12px 20px;border-radius:14px;background:linear-gradient(90deg,#f58529,#dd2a7b,#8134af)">Instagram</span>
<span style="padding:12px 6px;font-size:30px">→</span><span style="padding:12px 20px;border-radius:14px;background:#fff;color:#111">🤖 Agent</span></div>
<div style="position:absolute;right:70px;top:250px;display:flex;align-items:center;gap:6px">
<div class="bot">🤖</div><div style="font-size:90px;filter:drop-shadow(0 0 25px #ff3d6e)">❤️</div><div class="bot" style="box-shadow:0 0 0 6px #8c46ff,0 20px 50px rgba(0,0,0,.7)">🤖</div></div>
<div class="sticker" style="right:120px;top:70px;font-size:64px">94%<div style="font-size:30px">MATCH</div></div>
</body></html>`;
const B = `<html><head>${FONTS}<style>${common}</style></head><body><div class="glow" style="background:radial-gradient(800px 600px at 80% 40%,rgba(255,60,110,.6),transparent 60%),radial-gradient(600px 500px at 0% 100%,rgba(140,70,255,.45),transparent 60%)"></div>
<img class="ui" src="ui-profile.png" style="width:700px;left:560px;top:60px;transform:perspective(1400px) rotateY(-18deg) rotateZ(-3deg);opacity:.95">
<div style="position:absolute;inset:0;background:linear-gradient(90deg,#0b080d 38%,rgba(11,8,13,.35) 70%,rgba(11,8,13,.05))"></div>
<div class="h" style="position:absolute;left:54px;top:60px;font-size:96px">I let my</div>
<div class="h" style="position:absolute;left:54px;top:150px;font-size:150px"><span class="hl">AI agent</span></div>
<div class="h" style="position:absolute;left:54px;top:315px;font-size:96px">go on 53<br>dates</div>
<div style="position:absolute;left:58px;bottom:44px;display:flex;align-items:center;gap:12px;font:800 28px Fraunces"><span style="width:48px;height:48px;border-radius:14px;background:#ff3d6e;display:grid;place-items:center;font-size:24px">♥</span>Wingmate <span style="font:800 22px Inter;color:#cfc3cf;margin-left:10px">LinkedIn + Instagram → AI agents</span></div>
<div class="sticker" style="right:70px;bottom:60px;font-size:70px;transform:rotate(-7deg)">94%<div style="font-size:32px">MATCH ♥</div></div>
</body></html>`;
fs.writeFileSync("tA.html", A); fs.writeFileSync("tB.html", B);
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
for (const n of ["A", "B"]) {
  await p.goto("file:///E:/wingmate-video/t" + n + ".html", { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `thumbnail-${n}.png` });
}
await b.close();
