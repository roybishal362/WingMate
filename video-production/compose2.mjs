// Launch-style edit: animated intro → (chapter card → framed screen recording) × features → animated outro.
import { spawnSync } from "child_process";
import fs from "fs";
import ffmpeg from "ffmpeg-static";
import ffprobeInst from "@ffprobe-installer/ffprobe";

const ffprobe = ffprobeInst.path;
const FONT = "C\\:/Windows/Fonts/segoeuib.ttf";
const WIN = { x: 272, y: 270, w: 1376, h: 774 };
const BG = "0x0c0a0e";
fs.mkdirSync("out2", { recursive: true });

const dur = (f) => Number(spawnSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).stdout.toString().trim());
const run = (args) => {
  const r = spawnSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", ...args], { maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(r.stderr.toString());
};
const ENC = ["-c:v", "libx264", "-preset", "fast", "-crf", "18", "-r", "30", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2"];
const audioChain = (L) => `aresample=44100,aformat=channel_layouts=stereo,apad,atrim=0:${L},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.15,afade=t=out:st=${(L - 0.35).toFixed(2)}:d=0.35`;
const fades = (L) => `fade=t=in:st=0:d=0.45:color=${BG},fade=t=out:st=${(L - 0.45).toFixed(2)}:d=0.45:color=${BG}`;

const parts = [];
let total = 0;

function card(name, file, L, audio, skip = 0.4) {
  const out = `out2/${parts.length.toString().padStart(2, "0")}_${name}.mp4`;
  if (process.env.ONLY && process.env.ONLY !== name && fs.existsSync(out)) {
    parts.push(out);
    total += L;
    console.log(`${name}: reused`);
    return;
  }
  const ain = audio ? ["-i", audio] : ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"];
  run(["-i", file, ...ain, "-filter_complex",
    `[0:v]trim=start=${skip},setpts=PTS-STARTPTS,fps=30,scale=1920:1080:flags=lanczos,tpad=stop_mode=clone:stop_duration=3,${fades(L)},format=yuv420p[v];[1:a]${audioChain(L)}[a]`,
    "-map", "[v]", "-map", "[a]", "-t", String(L), ...ENC, out]);
  parts.push(out);
  total += L;
  console.log(`${name}: ${L}s`);
}

function framed(name, minL, cuts = null) {
  const clip = `clips/${name}.webm`;
  const audio = `audio/${name}.mp3`;
  const vd = cuts ? cuts.reduce((a, [x, y]) => a + (y - x), 0) : dur(clip);
  const ad = dur(audio);
  const L = +Math.max(ad + 0.9, minL).toFixed(2);
  const speed = vd / L;
  const out = `out2/${parts.length.toString().padStart(2, "0")}_${name}.mp4`;
  if (process.env.ONLY && process.env.ONLY !== name && fs.existsSync(out)) {
    parts.push(out);
    total += L;
    console.log(`${name}: reused`);
    return;
  }
  const pre = cuts
    ? `[1:v]split=${cuts.length}${cuts.map((_, i) => `[x${i}]`).join("")};` +
      cuts.map(([a, b], i) => `[x${i}]trim=${a}:${b},setpts=PTS-STARTPTS[y${i}];`).join("") +
      `${cuts.map((_, i) => `[y${i}]`).join("")}concat=n=${cuts.length}:v=1:a=0[raw];[raw]`
    : `[1:v]`;
  const jumpAt = cuts && cuts.length > 1 ? (cuts[0][1] - cuts[0][0]) / Math.max(1, vd / L) : null;
  const ff = jumpAt
    ? `,drawtext=fontfile='${FONT}':text='>> Fast-forward  -  all 3 dates finished':x=${WIN.x}+24:y=${WIN.y}+20:fontsize=24:fontcolor=0xff5c7c:box=1:boxcolor=${BG}@0.85:boxborderw=12:enable='between(t,${jumpAt.toFixed(2)},${(jumpAt + 3.5).toFixed(2)})'`
    : "";
  const sp = speed > 1 ? `setpts=PTS/${speed.toFixed(4)},` : "";
  const label =
    speed > 1.35
      ? `,drawtext=fontfile='${FONT}':text='${(Math.round(speed * 10) / 10).toFixed(1)}x speed':x=${WIN.x + WIN.w}-tw-22:y=${WIN.y + WIN.h}-th-18:fontsize=22:fontcolor=white@0.9:box=1:boxcolor=${BG}@0.7:boxborderw=10`
      : "";
  run(["-loop", "1", "-framerate", "30", "-i", `frames/${name}.png`, "-i", clip, "-loop", "1", "-framerate", "30", "-i", "frames/mask.png", "-i", audio,
    "-filter_complex",
    `${pre}${sp}fps=30,scale=${WIN.w}:${WIN.h}:flags=lanczos,tpad=stop_mode=clone:stop_duration=4,format=rgba[c];` +
    `[2:v]scale=${WIN.w}:${WIN.h},format=gray[m];[c][m]alphamerge[cm];` +
    `[0:v]scale=1920:1080,format=rgba[b];[b][cm]overlay=${WIN.x}:${WIN.y}:shortest=1${label}${ff},${fades(L)},format=yuv420p[v];` +
    `[3:a]${audioChain(L)}[a]`,
    "-map", "[v]", "-map", "[a]", "-t", String(L), ...ENC, out]);
  parts.push(out);
  total += L;
  console.log(`${name}: clip ${vd.toFixed(1)}s, voice ${ad.toFixed(1)}s -> ${L}s @ ${speed.toFixed(2)}x`);
}

card("intro", "cards/intro.webm", 6.6, "audio/s0_title.mp3");
framed("s1_home", 0);
card("c1", "cards/c1.webm", 2.2);
framed("s2_live", 36, [[0, 62], [124, 136]]);
card("c2", "cards/c2.webm", 2.2);
framed("s3_profile", 26);
card("c3", "cards/c3.webm", 2.2);
framed("s4_date", 28);
card("c4", "cards/c4.webm", 2.2);
framed("s5_rank", 0);
card("outro", "cards/outro.webm", 12, "audio/s6_end.mp3");

fs.writeFileSync("out2/list.txt", parts.map((p) => `file '${p.replace("out2/", "")}'`).join("\n"));
run(["-f", "concat", "-safe", "0", "-i", "out2/list.txt", "-c", "copy", "-movflags", "+faststart", "wingmate-launch.mp4"]);
console.log(`TOTAL ${total.toFixed(1)}s -> wingmate-launch.mp4 (${(fs.statSync("wingmate-launch.mp4").size / 1e6).toFixed(1)} MB)`);
