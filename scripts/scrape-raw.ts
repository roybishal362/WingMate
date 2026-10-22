// Batched Apify runs for the seed people -> data/cache/raw-li.json, raw-ig.json
// Apify free plan: LinkedIn actor max 10 profiles per run, so we chunk.
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });
import fs from "fs";
import { callLinkedIn, callInstagram } from "../lib/apify";
import { readPeopleCsv } from "./csv";

const chunk = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

function merge(file: string, items: Record<string, unknown>[], key: (x: Record<string, unknown>) => string) {
  let old: Record<string, unknown>[] = [];
  try {
    old = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {}
  const m = new Map<string, Record<string, unknown>>();
  for (const x of old) if (key(x)) m.set(key(x), x);
  for (const x of items) if (key(x)) m.set(key(x), x);
  fs.writeFileSync(file, JSON.stringify([...m.values()], null, 1));
  return m.size;
}

async function main() {
  fs.mkdirSync("data/cache", { recursive: true });
  const mode = process.argv[2] ?? "both"; // li | ig | both
  const filter = process.argv[3] ? new Set(process.argv[3].split(",")) : null; // optional igUser list
  const rows = readPeopleCsv("data/people.csv").filter((r) => !filter || filter.has(r.igUser));
  console.log(`people: ${rows.length}`);
  const jobs: Promise<unknown>[] = [];
  if (mode !== "ig") {
    for (const part of chunk(rows, 10)) {
      jobs.push(
        callLinkedIn(part.map((r) => r.linkedin)).then((items) => {
          const ok = items.filter((i) => !i.error);
          const total = merge("data/cache/raw-li.json", ok, (x) => String(x.publicIdentifier ?? "").toLowerCase());
          console.log(`linkedin chunk: ${ok.length}/${items.length} ok (total ${total})`, items.filter((i) => i.error).map((i) => i.error));
        })
      );
    }
  }
  if (mode !== "li") {
    jobs.push(
      callInstagram(rows.map((r) => r.igUser)).then((items) => {
        const total = merge("data/cache/raw-ig.json", items.filter((i) => Array.isArray(i.latestPosts) && (i.latestPosts as unknown[]).length), (x) => String(x.username ?? "").toLowerCase());
        console.log(`instagram: ${items.length} items (total with posts ${total})`);
      })
    );
  }
  await Promise.all(jobs);
  console.log("done");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
