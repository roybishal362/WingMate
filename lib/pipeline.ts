// Shared pipeline steps used by both the live API and the seed script.
import { normalizeInstagram, normalizeLinkedIn } from "./normalize";
import type { Person } from "./types";

export function personId(name: string, slug: string) {
  const base = (name || slug)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || slug;
}

export function buildPerson(opts: {
  id: string;
  name?: string;
  liSlug: string;
  igUser: string;
  liItem: Record<string, unknown>;
  igItem: Record<string, unknown>;
  origin: "demo" | "live";
}): Person {
  const linkedin = normalizeLinkedIn(opts.liItem, opts.liSlug);
  const instagram = normalizeInstagram(opts.igItem);
  return {
    id: opts.id,
    name: opts.name || linkedin.fullName || instagram.fullName || opts.igUser,
    linkedinUrl: linkedin.url,
    instagramUrl: instagram.url,
    liSlug: opts.liSlug,
    igUser: opts.igUser,
    avatar: instagram.avatar || linkedin.photo,
    headline: linkedin.headline,
    location: linkedin.location,
    status: "scraped",
    source: { linkedin, instagram },
    createdAt: Date.now(),
    origin: opts.origin,
  };
}

export async function fetchAsDataUrl(url: string | undefined, maxBytes = 400_000): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
    if (!r.ok) return undefined;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > maxBytes) return undefined;
    const type = r.headers.get("content-type") || "image/jpeg";
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}
