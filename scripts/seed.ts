// Seed the demo: scraped data -> agents read -> agents swipe -> agents date -> data/demo.json
// Resumable: every stage is saved to data/seed, re-running skips finished work.
// Usage: npx tsx scripts/seed.ts [--limit N] [--only analyze|screen|dates|export]
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });
import fs from "fs";
import path from "path";
import { FileStore } from "../lib/store";
import { readPeopleCsv } from "./csv";
import { buildPerson, personId } from "../lib/pipeline";
import { liKey } from "../lib/normalize";
import { analyzePerson } from "../lib/agents/analyst";
import { screen } from "../lib/agents/screener";
import { choosePairs, initiator, newDate, swipeMap } from "../lib/pairing";
import { stepDate } from "../lib/agents/dater";
import type { Person } from "../lib/types";

const args = process.argv.slice(2);
const arg = (k: string) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};
const LIMIT = Number(arg("--limit") ?? 999);
const ONLY = arg("--only");
const store = new FileStore("data/seed");

async function pool<T>(items: T[], n: number, fn: (x: T, i: number) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        try {
          await fn(items[k], k);
        } catch (e) {
          console.error("  ✗", (e as Error).message);
        }
      }
    })
  );
}

async function download(url: string | undefined, file: string): Promise<string | undefined> {
  if (!url) return undefined;
  const out = path.join("public", file);
  if (fs.existsSync(out)) return "/" + file.replace(/\\/g, "/");
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
    if (!r.ok) return undefined;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
    return "/" + file.replace(/\\/g, "/");
  } catch {
    return undefined;
  }
}

async function buildPeople(): Promise<Person[]> {
  const rows = readPeopleCsv("data/people.csv");
  const li = JSON.parse(fs.readFileSync("data/cache/raw-li.json", "utf8")) as Record<string, unknown>[];
  const ig = JSON.parse(fs.readFileSync("data/cache/raw-ig.json", "utf8")) as Record<string, unknown>[];
  const out: Person[] = [];
  for (const r of rows) {
    if (out.length >= LIMIT) break;
    const liItem = li.find((x) => liKey(x) === r.slug);
    const igItem = ig.find((x) => String(x.username ?? "").toLowerCase() === r.igUser);
    if (!liItem || !igItem) {
      console.log(`  skip ${r.name}: ${!liItem ? "no LinkedIn" : "no Instagram"}`);
      continue;
    }
    if (igItem.private) {
      console.log(`  skip ${r.name}: private Instagram`);
      continue;
    }
    const id = personId(r.name, r.slug);
    const existing = await store.getPerson(id);
    if (existing) {
      out.push(existing);
      continue;
    }
    const p = buildPerson({ id, name: r.name, liSlug: r.slug, igUser: r.igUser, liItem, igItem, origin: "demo" });
    // cache media locally so the demo never depends on expiring CDN links
    p.avatar = (await download(p.source!.instagram.avatar, `media/${id}/avatar.jpg`)) ?? (await download(p.source!.linkedin.photo, `media/${id}/avatar-li.jpg`));
    const posts = p.source!.instagram.posts;
    for (let k = 0; k < posts.length; k++) {
      posts[k].image = k < 4 ? await download(posts[k].image, `media/${id}/p${k}.jpg`) : undefined;
    }
    p.source!.linkedin.photo = undefined;
    p.source!.instagram.avatar = p.avatar;
    await store.savePerson(p);
    out.push(p);
  }
  return out;
}

async function main() {
  console.log("== people");
  let people = await buildPeople();
  console.log(`  ${people.length} people`);

  if (!ONLY || ONLY === "analyze") {
    console.log("== agents read their people");
    await pool(
      people.filter((p) => !p.analysis),
      4,
      async (p) => {
        const t = Date.now();
        p.analysis = await analyzePerson(p);
        p.status = "analyzed";
        await store.savePerson(p);
        console.log(`  ✓ ${p.name} (${((Date.now() - t) / 1000).toFixed(0)}s) — ${p.analysis.tagline}`);
      }
    );
    people = await Promise.all(people.map(async (p) => (await store.getPerson(p.id))!));
  }
  const ready = people.filter((p) => p.analysis);

  if (!ONLY || ONLY === "screen") {
    console.log("== agents swipe");
    const have = new Set((await store.listSwipes()).map((s) => s.from));
    await pool(
      ready.filter((p) => !have.has(p.id)),
      4,
      async (p) => {
        const sw = await screen(p, ready.filter((x) => x.id !== p.id));
        await store.saveSwipes(sw);
        console.log(`  ✓ ${p.name} rated ${sw.length}`);
      }
    );
  }

  if (!ONLY || ONLY === "dates") {
    console.log("== agents date");
    const swipes = await store.listSwipes();
    const sm = swipeMap(swipes);
    const pairs = choosePairs(ready, swipes, 3, 4);
    const existing = await store.listDates();
    const key = (a: string, b: string) => [a, b].sort().join("|");
    const byKey = new Map(existing.map((d) => [key(d.a, d.b), d]));
    for (const [x, y] of pairs) {
      if (byKey.has(key(x, y))) continue;
      const [a, b] = initiator(sm, x, y);
      const d = newDate(a, b, "demo");
      await store.saveDate(d);
      byKey.set(key(a, b), d);
    }
    const pm = Object.fromEntries(ready.map((p) => [p.id, p]));
    const todo = [...byKey.values()].filter((d) => d.status !== "done" && pm[d.a] && pm[d.b]);
    console.log(`  ${pairs.length} pairs, ${todo.length} dates to run`);
    let done = 0;
    await pool(todo, 6, async (d0) => {
      let d = d0;
      while (d.status !== "done") {
        d = await stepDate(d, pm);
        await store.saveDate(d);
      }
      done++;
      const s = d.debriefs.map((x) => `${pm[x.personId].name.split(" ")[0]}:${x.overall}/${x.verdict}`).join(" ");
      console.log(`  ♥ [${done}/${todo.length}] ${pm[d.a].name} × ${pm[d.b].name} @ ${d.venue} → ${s}`);
    });
  }

  console.log("== export data/demo.json");
  const finalPeople = (await store.listPeople()).filter((p) => p.analysis).map((p) => ({ ...p, status: "ready" as const, origin: "demo" as const }));
  const ids = new Set(finalPeople.map((p) => p.id));
  const dates = (await store.listDates()).filter((d) => d.status === "done" && ids.has(d.a) && ids.has(d.b));
  const swipes = (await store.listSwipes()).filter((s) => ids.has(s.from) && ids.has(s.to));
  for (const p of finalPeople) p.dateIds = dates.filter((d) => d.a === p.id || d.b === p.id).map((d) => d.id);
  fs.writeFileSync("data/demo.json", JSON.stringify({ people: finalPeople, swipes, dates, generatedAt: Date.now() }));
  console.log(`  ${finalPeople.length} people · ${swipes.length} swipes · ${dates.length} dates`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
