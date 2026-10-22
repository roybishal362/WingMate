// Turn raw Apify dataset items into one clean SourceData shape.
import type { InstagramData, LinkedInData } from "./types";
import { igUrl, liUrl } from "./links";

type R = Record<string, unknown>;
const s = (v: unknown): string => (v == null ? "" : typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const arr = (v: unknown): R[] => (Array.isArray(v) ? (v as R[]) : []);
const n = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);

function textOf(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const o = v as R;
    return s(o.linkedinText) || s(o.text) || s(o.name) || s(o.title) || s(o.default) || s((o.parsed as R)?.text) || "";
  }
  return "";
}

function period(x: R): string {
  const d = s(x.duration) || s(x.period);
  if (d) return d;
  const st = textOf(x.startDate) || s((x.startDate as R)?.year);
  const en = textOf(x.endDate) || s((x.endDate as R)?.year);
  return [st, en].filter(Boolean).join(" – ");
}

export function liKey(item: R): string {
  return (s(item.publicIdentifier) || s(item.linkedinUrl).match(/\/in\/([^/?#]+)/)?.[1] || s(item.query)).toLowerCase();
}

export function normalizeLinkedIn(item: R, slug: string): LinkedInData {
  const first = s(item.firstName);
  const last = s(item.lastName);
  return {
    url: s(item.linkedinUrl) || liUrl(slug),
    fullName: [first, last].filter(Boolean).join(" ") || s(item.fullName) || s(item.name),
    headline: s(item.headline),
    about: s(item.about) || s(item.summary),
    location: textOf(item.location),
    photo: s(item.photo) || s(item.profilePicture) || undefined,
    followers: n(item.followerCount) || undefined,
    connections: n(item.connectionsCount) || undefined,
    experience: arr(item.experience).map((x) => ({
      title: s(x.position) || s(x.title),
      company: s(x.companyName) || s(x.company),
      duration: period(x),
      description: s(x.description),
    })),
    education: arr(item.education).map((x) => ({
      school: s(x.schoolName) || s(x.school),
      degree: s(x.degree),
      field: s(x.fieldOfStudy),
      period: s(x.period) || period(x),
    })),
    skills: arr(item.skills).map((x) => textOf(x)).filter(Boolean),
    certifications: arr(item.certifications).map((x) => textOf(x)).filter(Boolean),
    languages: arr(item.languages).map((x) => [textOf(x), s(x.proficiency)].filter(Boolean).join(" — ")).filter(Boolean),
    volunteering: arr(item.volunteering).map((x) => [s(x.role) || s(x.title), s(x.organizationName) || s(x.companyName) || s(x.organization)].filter(Boolean).join(" @ ")).filter(Boolean),
    honors: arr(item.honorsAndAwards).map((x) => [textOf(x), s(x.issuer) || s(x.issuedBy)].filter(Boolean).join(" — ")).filter(Boolean),
    projects: arr(item.projects).map((x) => [textOf(x), s(x.description)].filter(Boolean).join(": ")).filter(Boolean),
    publications: arr(item.publications).map((x) => textOf(x)).filter(Boolean),
  };
}

export function normalizeInstagram(item: R): InstagramData {
  const posts = arr(item.latestPosts).map((p) => ({
    id: s(p.id) || s(p.shortCode),
    url: s(p.url),
    caption: s(p.caption),
    hashtags: Array.isArray(p.hashtags) ? (p.hashtags as string[]).slice(0, 12) : [],
    alt: s(p.alt),
    location: s(p.locationName) || undefined,
    likes: n(p.likesCount),
    comments: n(p.commentsCount),
    timestamp: s(p.timestamp),
    type: s(p.type) || "Image",
    image: s(p.displayUrl) || undefined,
  }));
  const ext = arr(item.externalUrls)[0];
  return {
    url: s(item.url) || igUrl(s(item.username)),
    username: s(item.username),
    fullName: s(item.fullName),
    bio: s(item.biography),
    externalUrl: s(item.externalUrl) || s(ext?.url) || undefined,
    followers: n(item.followersCount),
    following: n(item.followsCount),
    postsCount: n(item.postsCount),
    verified: !!item.verified,
    category: s(item.businessCategoryName) || undefined,
    avatar: s(item.profilePicUrlHD) || s(item.profilePicUrl) || undefined,
    posts,
  };
}

export function igIsPrivate(item: R) {
  return !!item.private;
}
