import { ApifyClient } from "apify-client";
import { env } from "./env";

let _client: ApifyClient | null = null;
function client() {
  if (!_client) {
    const token = env.apifyToken();
    if (!token) throw new Error("APIFY_TOKEN is not configured");
    _client = new ApifyClient({ token });
  }
  return _client;
}

export function linkedinInput(urls: string[]) {
  return { profileScraperMode: "Profile details no email ($4 per 1k)", queries: urls };
}
export function instagramInput(usernames: string[]) {
  return { usernames };
}

export async function startLinkedIn(urls: string[]) {
  const run = await client().actor(env.linkedinActor()).start(linkedinInput(urls));
  return run.id;
}
export async function startInstagram(usernames: string[]) {
  const run = await client().actor(env.instagramActor()).start(instagramInput(usernames));
  return run.id;
}

/** Posts-only fallback when the profile scraper's timeline request is rate-limited. */
export async function startInstagramPosts(username: string) {
  const run = await client()
    .actor("apify/instagram-scraper")
    .start({ directUrls: [`https://www.instagram.com/${username}/`], resultsType: "posts", resultsLimit: 12, addParentData: false });
  return run.id;
}

export async function runInfo(runId: string) {
  const run = await client().run(runId).get();
  return { status: run?.status ?? "UNKNOWN", datasetId: run?.defaultDatasetId };
}

export async function runItems(runId: string): Promise<Record<string, unknown>[]> {
  const run = await client().run(runId).get();
  if (!run) return [];
  const { items } = await client().dataset(run.defaultDatasetId).listItems({ clean: true });
  return items as Record<string, unknown>[];
}

// Blocking batch helpers (used by the seed script)
export async function callLinkedIn(urls: string[]) {
  const run = await client().actor(env.linkedinActor()).call(linkedinInput(urls), { waitSecs: 900 });
  const { items } = await client().dataset(run.defaultDatasetId).listItems({ clean: true });
  return items as Record<string, unknown>[];
}
export async function callInstagram(usernames: string[]) {
  const run = await client().actor(env.instagramActor()).call(instagramInput(usernames), { waitSecs: 900 });
  const { items } = await client().dataset(run.defaultDatasetId).listItems({ clean: true });
  return items as Record<string, unknown>[];
}
