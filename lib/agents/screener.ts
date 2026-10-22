// Swiping: each agent reviews the other people's cards and rates them for its person.
import { z } from "zod";
import { llmJSON, num, str } from "../llm";
import type { Person, Swipe } from "../types";

const labels = (xs: { label: string }[] | undefined, n: number) => (xs ?? []).slice(0, n).map((x) => x.label).join(", ");

export function card(p: Person): string {
  const a = p.analysis;
  if (!a) return `${p.id} | ${p.name}`;
  return [
    `id=${p.id}`,
    p.name,
    a.tagline,
    p.location ? `based: ${p.location}` : "",
    `work: ${p.headline ?? ""}`.slice(0, 110),
    `interests: ${labels(a.interests, 5)}`,
    `hobbies: ${labels(a.hobbies, 4)}`,
    `values: ${labels(a.values, 3)}`,
    `needs: ${labels(a.needs, 3)}`,
  ]
    .filter(Boolean)
    .join(" | ");
}

export function agentSelf(p: Person): string {
  const a = p.analysis!;
  return [
    `${p.name} — ${a.tagline}`,
    a.summary,
    `Needs: ${a.needs.map((n) => `${n.label} (${n.detail})`).join("; ")}`,
    `Looking for: ${a.brief.lookingFor.join("; ")}`,
    `Dealbreakers: ${a.brief.dealbreakers.join("; ")}`,
    `Interests: ${labels(a.interests, 7)} · Hobbies: ${labels(a.hobbies, 6)} · Values: ${labels(a.values, 5)}`,
  ].join("\n");
}

const RatingsSchema = z.object({
  ratings: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(z.object({ id: str, score: num(0, 100), reason: str }))
  ),
});

const SWIPE_RULES = `Score 0-100 how promising a first date would be. Judge real compatibility: complementary needs, shared interests and values, compatible lifestyles and life stage, how their energies would mix. Use the full range — be discerning, most people should land between 35 and 80, only a few above 85. Reason: max 16 words, specific (mention the actual overlap or clash).`;

/** The agent of `self` swipes on every candidate. Returns swipes self -> candidate. */
export async function screen(self: Person, candidates: Person[]): Promise<Swipe[]> {
  const ids = new Set(candidates.map((c) => c.id));
  const system = `You are the dating agent for ${self.name}. You're swiping through profiles on their behalf, deciding who is worth a date.\n\nYOUR PERSON:\n${agentSelf(self)}\n\n${SWIPE_RULES}\n\nRespond with JSON only: {"ratings": [{"id": "<candidate id>", "score": 0-100, "reason": "..."}]} — one entry for EVERY candidate.`;
  const user = `Candidates:\n${candidates.map(card).join("\n")}\n\nRate all ${candidates.length} candidates now.`;
  const r = await llmJSON({ task: "deep", system, user, schema: RatingsSchema, maxTokens: 3500, temperature: 0.4, label: `swipe ${self.name}` });
  return r.ratings
    .filter((x) => ids.has(x.id))
    .map((x) => ({ from: self.id, to: x.id, score: Math.round(x.score), reason: x.reason }));
}

/** Each existing agent judges a newcomer for its own person (one batched call). Returns swipes candidate -> newcomer. */
export async function reverseScreen(newcomer: Person, candidates: Person[]): Promise<Swipe[]> {
  const ids = new Set(candidates.map((c) => c.id));
  const system = `You simulate a room of dating agents. Each agent represents one person (listed below with what they need and look for). A newcomer just joined. Each agent decides how promising a date with the newcomer would be FOR THEIR OWN PERSON.\n\n${SWIPE_RULES}\n\nRespond with JSON only: {"ratings": [{"id": "<agent's person id>", "score": 0-100, "reason": "..."}]} — one entry for EVERY agent.`;
  const user = `NEWCOMER:\n${card(newcomer)}\nSummary: ${newcomer.analysis?.summary ?? ""}\n\nAGENTS' PEOPLE:\n${candidates
    .map((c) => `${card(c)} | looking for: ${(c.analysis?.brief.lookingFor ?? []).slice(0, 3).join("; ")}`)
    .join("\n")}\n\nEach agent rates the newcomer now.`;
  const r = await llmJSON({ task: "deep", system, user, schema: RatingsSchema, maxTokens: 3500, temperature: 0.4, label: `reverse-swipe ${newcomer.name}` });
  return r.ratings
    .filter((x) => ids.has(x.id))
    .map((x) => ({ from: x.id, to: newcomer.id, score: Math.round(x.score), reason: x.reason }));
}
