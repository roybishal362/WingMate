// The Analyst: the agent reads its person from exactly two sources
// (LinkedIn + public Instagram) and writes an evidence-backed profile.
import { z } from "zod";
import { llmJSON, num, str, strArr } from "../llm";
import type { Analysis, BigFiveKey, Person, SourceData } from "../types";

const cut = (s: string | undefined, n: number) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
};

export function sourceText(src: SourceData): string {
  const li = src.linkedin;
  const ig = src.instagram;
  const L: string[] = [];
  L.push("=== SOURCE 1: LINKEDIN ===");
  L.push(`Name: ${li.fullName}`);
  if (li.headline) L.push(`Headline: ${cut(li.headline, 220)}`);
  if (li.location) L.push(`Location: ${li.location}`);
  if (li.followers) L.push(`Followers: ${li.followers}`);
  if (li.about) L.push(`About: ${cut(li.about, 1300)}`);
  if (li.experience.length) {
    L.push("Experience:");
    li.experience.slice(0, 7).forEach((x, i) =>
      L.push(`  [LI exp ${i + 1}] ${x.title} @ ${x.company}${x.duration ? ` (${x.duration})` : ""}${x.description ? ` — ${cut(x.description, 200)}` : ""}`)
    );
  }
  if (li.education.length) {
    L.push("Education:");
    li.education.slice(0, 4).forEach((x) => L.push(`  - ${[x.degree, x.field].filter(Boolean).join(", ")} @ ${x.school}${x.period ? ` (${x.period})` : ""}`));
  }
  if (li.skills.length) L.push(`Skills: ${li.skills.slice(0, 18).join(", ")}`);
  if (li.languages.length) L.push(`Languages: ${li.languages.join(", ")}`);
  if (li.certifications.length) L.push(`Certifications: ${li.certifications.slice(0, 6).join("; ")}`);
  if (li.volunteering.length) L.push(`Volunteering: ${li.volunteering.slice(0, 5).join("; ")}`);
  if (li.honors.length) L.push(`Honors: ${li.honors.slice(0, 5).join("; ")}`);
  if (li.projects.length) L.push(`Projects: ${li.projects.slice(0, 4).map((p) => cut(p, 120)).join("; ")}`);
  if (li.publications.length) L.push(`Publications: ${li.publications.slice(0, 4).join("; ")}`);

  L.push("");
  L.push("=== SOURCE 2: INSTAGRAM (public) ===");
  L.push(`@${ig.username} — ${ig.fullName}${ig.verified ? " (verified)" : ""}`);
  if (ig.bio) L.push(`Bio: ${cut(ig.bio, 300)}`);
  if (ig.category) L.push(`Category: ${ig.category}`);
  L.push(`Followers: ${ig.followers} · Following: ${ig.following} · Posts: ${ig.postsCount}`);
  if (ig.externalUrl) L.push(`Link in bio: ${ig.externalUrl}`);
  ig.posts.slice(0, 12).forEach((p, i) => {
    const bits = [`[IG post ${i + 1}] ${p.timestamp?.slice(0, 10) ?? ""} ${p.type}`];
    if (p.location) bits.push(`at ${p.location}`);
    bits.push(`${p.likes} likes`);
    L.push(bits.join(" · "));
    if (p.caption) L.push(`   caption: "${cut(p.caption, 230)}"`);
    if (p.alt) L.push(`   image shows: ${cut(p.alt, 140)}`);
  });
  return L.join("\n");
}

const SYSTEM = `You are a perceptive, warm dating agent. You are about to represent one real person on a dating platform, and you must first READ them.

You have exactly TWO sources: their LinkedIn profile and their public Instagram. Use ONLY these. Do NOT use any outside knowledge about this person, even if they are famous — if it's not in the sources, you don't know it.

How to read well:
- Read career moves, the About text, skills and volunteering for ambition, values and life stage.
- Read Instagram captions, photos ("image shows"), locations and hashtags for hobbies, lifestyle, humour, tone of voice and what they care about off the clock.
- Cross-check: when both sources say the same thing, confidence is high. When the persona on LinkedIn differs from Instagram, note it — it's interesting.
- "Needs" = what this person likely needs from a partner to thrive (e.g. "a partner who respects an intense build schedule", "someone who'll travel spontaneously"). Infer them from the evidence and explain why.
- Every trait cites evidence: source ("linkedin" or "instagram") plus a short reference like "LI exp 2: Founder @ X" or "IG post 4 caption: 'sunrise run'".
- Never infer religion, health, sexuality, ethnicity, politics or current relationship status. Do not mention spouses, partners or children by role (this is a compatibility simulation) — say "family-oriented" instead. Never invent facts.

Respond with ONE JSON object only, in exactly this shape:
{
  "tagline": "6-10 word dating-profile style tagline",
  "summary": "3-4 sentence portrait of who they are and what they'd be like to date",
  "readingLog": [ {"source": "linkedin|instagram", "item": "what you looked at, e.g. 'IG post 3'", "note": "what it tells you"} ],
  "needs":     [ {"label": "short", "detail": "1 sentence why", "evidence": [{"source": "linkedin|instagram", "ref": "short ref"}], "confidence": "high|medium|low"} ],
  "hobbies":   [ same trait shape ],
  "interests": [ same trait shape ],
  "values":    [ same trait shape ],
  "lifestyle": [ same trait shape ],
  "personality": [ {"trait": "openness|conscientiousness|extraversion|agreeableness|emotional_stability", "score": 0-100, "why": "short evidence-based reason"} ],
  "communicationStyle": "1-2 sentences on how they talk/write",
  "career": "1-2 sentences on career stage and ambition",
  "greenFlags": ["..."],
  "friction": ["possible friction points in a relationship, kind but honest"],
  "conversationHooks": ["specific things from their profile a date could ask about"],
  "dateIdeas": ["specific first-date ideas that fit them"],
  "brief": {
    "voice": "how to sound like them on a date (tone, energy, phrases)",
    "lookingFor": ["what you'll look for in a match on their behalf"],
    "mustCheck": ["2-3 questions you MUST get answered on any date for them"],
    "dealbreakers": ["things that would make a match wrong for them"],
    "highlights": ["things you're proud to share about them"]
  }
}
Counts: readingLog 8-10, needs 3-5, hobbies 3-6, interests 4-7, values 3-5, lifestyle 2-4, personality all 5, greenFlags 3, friction 2, conversationHooks 3-4, dateIdeas 3.`;

const ev = z.object({
  source: z.preprocess((v) => (String(v).toLowerCase().includes("insta") || String(v).toLowerCase() === "ig" ? "instagram" : "linkedin"), z.enum(["linkedin", "instagram"])),
  ref: str,
});
const conf = z.preprocess((v) => {
  const s = String(v ?? "").toLowerCase();
  return s === "high" || s === "low" ? s : "medium";
}, z.enum(["high", "medium", "low"]));
const trait = z.object({ label: str, detail: str, evidence: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(ev)), confidence: conf });
const traits = z.preprocess(
  (v) => (Array.isArray(v) ? v.map((x) => (typeof x === "string" ? { label: x, detail: "", evidence: [], confidence: "low" } : x)) : []),
  z.array(trait)
);
const BIG5: BigFiveKey[] = ["openness", "conscientiousness", "extraversion", "agreeableness", "emotional_stability"];

const AnalysisSchema = z.object({
  tagline: str,
  summary: str,
  readingLog: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(z.object({ source: ev.shape.source, item: str, note: str }))
  ),
  needs: traits,
  hobbies: traits,
  interests: traits,
  values: traits,
  lifestyle: traits,
  personality: z.preprocess(
    (v) => (Array.isArray(v) ? v : v && typeof v === "object" ? Object.entries(v).map(([trait, score]) => ({ trait, score, why: "" })) : []),
    z.array(z.object({ trait: str, score: num(0, 100), why: str }))
  ),
  communicationStyle: str,
  career: str,
  greenFlags: strArr,
  friction: strArr,
  conversationHooks: strArr,
  dateIdeas: strArr,
  brief: z.preprocess(
    (v) => v ?? {},
    z.object({ voice: str, lookingFor: strArr, mustCheck: strArr, dealbreakers: strArr, highlights: strArr })
  ),
});

export async function analyzePerson(p: Person): Promise<Analysis> {
  if (!p.source) throw new Error("No scraped data yet");
  const user = `Read this person and build their dating profile.\n\n${sourceText(p.source)}\n\nReturn the JSON object now.`;
  const a = await llmJSON({
    task: "deep",
    system: SYSTEM,
    user,
    schema: AnalysisSchema,
    maxTokens: 5200,
    temperature: 0.6,
    label: `analyze ${p.name}`,
  });
  const personality = BIG5.map((k) => {
    const hit = a.personality.find((x) => x.trait.toLowerCase().replace(/[\s-]/g, "_").includes(k.split("_")[0]));
    return { trait: k, score: Math.round(hit?.score ?? 50), why: hit?.why ?? "" };
  });
  return { ...a, personality } as Analysis;
}
