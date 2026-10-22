// For profiles whose timeline was rate-limited: fetch the profile (bio) with
// apify/instagram-profile-scraper and the posts with apify/instagram-scraper, then merge.
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import fs from "fs";
import { ApifyClient } from "apify-client";
import { env } from "../lib/env";

async function main() {
  const users = process.argv[2].split(",");
  const c = new ApifyClient({ token: env.apifyToken() });
  const [profRun, postRun] = await Promise.all([
    c.actor("apify/instagram-profile-scraper").call({ usernames: users }, { waitSecs: 900 }),
    c.actor("apify/instagram-scraper").call(
      { directUrls: users.map((u) => `https://www.instagram.com/${u}/`), resultsType: "posts", resultsLimit: 12, addParentData: false },
      { waitSecs: 900 }
    ),
  ]);
  const profiles = (await c.dataset(profRun.defaultDatasetId).listItems({ clean: true })).items as Record<string, unknown>[];
  const posts = (await c.dataset(postRun.defaultDatasetId).listItems({ clean: true })).items as Record<string, unknown>[];
  console.log(`profiles ${profiles.length}, posts ${posts.length}`);
  const raw = JSON.parse(fs.readFileSync("data/cache/raw-ig.json", "utf8")) as Record<string, unknown>[];
  for (const p of profiles) {
    const u = String(p.username ?? "").toLowerCase();
    if (!u || p.private) continue;
    const mine = posts.filter((x) => String(x.ownerUsername ?? "").toLowerCase() === u).slice(0, 12);
    const have = Array.isArray(p.latestPosts) ? (p.latestPosts as unknown[]).length : 0;
    if (!have && mine.length) p.latestPosts = mine;
    const n = Array.isArray(p.latestPosts) ? (p.latestPosts as unknown[]).length : 0;
    console.log(`  ${u}: ${n} posts`);
    if (n >= 3) {
      const i = raw.findIndex((x) => String(x.username ?? "").toLowerCase() === u);
      if (i >= 0) raw[i] = p;
      else raw.push(p);
    }
  }
  fs.writeFileSync("data/cache/raw-ig.json", JSON.stringify(raw, null, 1));
  console.log("raw-ig total", raw.length);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
