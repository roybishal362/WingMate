import { NextResponse } from "next/server";
import { liveStore } from "@/lib/store";
import { runInfo, runItems } from "@/lib/apify";
import { buildPerson, fetchAsDataUrl } from "@/lib/pipeline";

export const maxDuration = 60;
const DONE = ["SUCCEEDED"];
const FAILED = ["FAILED", "ABORTED", "TIMED-OUT", "TIMED_OUT"];

// Step 2: poll both Apify runs; when finished, normalize the data into one profile source.
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = liveStore();
  const p = await store.getPerson(id);
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (p.status !== "scraping") return NextResponse.json({ person: p });

  const fail = async (msg: string) => {
    p.status = "error";
    p.error = msg;
    await store.savePerson(p);
    return NextResponse.json({ person: p });
  };

  const [li, ig] = await Promise.all([runInfo(p.apify!.liRunId!), runInfo(p.apify!.igRunId!)]);
  if (FAILED.includes(li.status)) return fail("The LinkedIn scraper run failed. Check the URL and try again.");
  if (FAILED.includes(ig.status)) return fail("The Instagram scraper run failed. Check the URL and try again.");
  if (!DONE.includes(li.status) || !DONE.includes(ig.status)) {
    return NextResponse.json({ person: p, li: li.status, ig: ig.status });
  }

  const [liItems, igItems] = await Promise.all([runItems(p.apify!.liRunId!), runItems(p.apify!.igRunId!)]);
  const liItem = liItems.find((x) => !x.error && (x.firstName || x.headline));
  const igItem = igItems.find((x) => x.username);
  if (!liItem) return fail(`LinkedIn: ${String(liItems[0]?.error ?? "profile not found")}`);
  if (!igItem) return fail("Instagram profile not found.");
  if (igItem.private) return fail("This Instagram account is private. Only public Instagram profiles can be used.");

  const built = buildPerson({ id: p.id, liSlug: p.liSlug, igUser: p.igUser, liItem, igItem, origin: "live" });
  built.apify = p.apify;
  built.createdAt = p.createdAt;
  // store a small copy of the avatar so it never expires
  built.avatar = (await fetchAsDataUrl(String(igItem.profilePicUrl ?? ""))) ?? (await fetchAsDataUrl(built.source!.linkedin.photo)) ?? built.avatar;
  await store.savePerson(built);
  return NextResponse.json({ person: built, li: li.status, ig: ig.status });
}
