import { NextResponse } from "next/server";
import { igUrl, igUsername, liSlug, liUrl } from "@/lib/links";
import { getPool, liveStore } from "@/lib/store";
import { startInstagram, startLinkedIn } from "@/lib/apify";
import { personId } from "@/lib/pipeline";
import type { Person } from "@/lib/types";

export const maxDuration = 60;

// Step 1: validate the two links, dedupe, start both Apify scrapers.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const slug = liSlug(String(body.linkedin ?? ""));
  const ig = igUsername(String(body.instagram ?? ""));
  if (!slug) return NextResponse.json({ error: "That doesn't look like a LinkedIn profile URL (linkedin.com/in/…)." }, { status: 400 });
  if (!ig) return NextResponse.json({ error: "That doesn't look like an Instagram profile URL (instagram.com/username)." }, { status: 400 });

  const ds = await getPool("live");
  const dupe = ds.people.find((p) => p.liSlug === slug || p.igUser === ig);
  if (dupe && dupe.status !== "error") return NextResponse.json({ id: dupe.id, existing: true, ready: !!dupe.analysis && dupe.status === "ready" });

  try {
    const [liRunId, igRunId] = await Promise.all([startLinkedIn([liUrl(slug)]), startInstagram([ig])]);
    const p: Person = {
      id: `${personId(ig, slug)}-${Math.random().toString(36).slice(2, 6)}`,
      name: ig,
      linkedinUrl: liUrl(slug),
      instagramUrl: igUrl(ig),
      liSlug: slug,
      igUser: ig,
      status: "scraping",
      apify: { liRunId, igRunId },
      createdAt: Date.now(),
      origin: "live",
    };
    await liveStore().savePerson(p);
    return NextResponse.json({ id: p.id });
  } catch (e) {
    return NextResponse.json({ error: `Could not start the Apify scrapers: ${(e as Error).message}` }, { status: 500 });
  }
}
