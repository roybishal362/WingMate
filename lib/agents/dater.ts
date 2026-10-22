// The date: two agents, each representing its own person, talk turn by turn.
// Every turn is a separate model call made by the agent whose turn it is.
import { z } from "zod";
import { llmJSON, num, str, strArr } from "../llm";
import type { DateRecord, Debrief, Person } from "../types";

const labels = (xs: { label: string }[] | undefined, n = 6) => (xs ?? []).slice(0, n).map((x) => x.label).join(", ");
const first = (name: string) => name.split(" ")[0];

function selfBrief(p: Person): string {
  const a = p.analysis!;
  return [
    `NAME: ${p.name}${p.location ? ` (based in ${p.location})` : ""}`,
    `WORK: ${p.headline ?? ""}`,
    `WHO THEY ARE: ${a.summary}`,
    `CAREER: ${a.career}`,
    `NEEDS IN A PARTNER: ${a.needs.map((x) => `${x.label} — ${x.detail}`).join("; ")}`,
    `HOBBIES: ${a.hobbies.map((x) => `${x.label}${x.detail ? ` (${x.detail})` : ""}`).join("; ")}`,
    `INTERESTS: ${labels(a.interests, 7)}`,
    `VALUES: ${labels(a.values, 5)}`,
    `LIFESTYLE: ${a.lifestyle.map((x) => `${x.label} — ${x.detail}`).join("; ")}`,
    `HIGHLIGHTS TO SHARE: ${a.brief.highlights.join("; ")}`,
    `VOICE: ${a.brief.voice} ${a.communicationStyle}`,
  ].join("\n");
}

function publicCard(p: Person): string {
  const a = p.analysis!;
  return [
    `NAME: ${p.name}${p.location ? ` (based in ${p.location})` : ""}`,
    `TAGLINE: ${a.tagline}`,
    `WORK: ${p.headline ?? ""}`,
    `INTERESTS: ${labels(a.interests, 6)} · HOBBIES: ${labels(a.hobbies, 5)}`,
    `FROM THEIR PROFILE YOU COULD ASK ABOUT: ${a.conversationHooks.slice(0, 4).join("; ")}`,
  ].join("\n");
}

function transcript(d: DateRecord, people: Record<string, Person>): string {
  if (!d.turns.length) return "(nothing said yet)";
  return d.turns.map((t) => `${first(people[t.speaker].name)}'s agent: ${t.message}`).join("\n");
}

const TurnSchema = z.object({
  venue: str.optional(),
  venueWhy: str.optional(),
  message: str,
  thought: str,
  interest: num(0, 10),
  checked: strArr.optional(),
});

function phase(i: number, max: number): string {
  if (i === 0) return "OPENING: you invited them. Name ONE specific venue/activity that fits BOTH of you (based on overlapping interests) and open with a warm, specific line that references something from their profile.";
  if (i === 1) return "FIRST REPLY: react to the venue and their opener in your person's voice, share something real about your person, and ask a question back.";
  if (i === max - 1) return "LAST TURN: wrap up the date naturally. Be honest about how it went for your person — warmly hint whether you'd want a second date (or would rather be friends).";
  if (i === max - 2) return "GO DEEPER: this is your chance to ask any MUST-CHECK question not yet answered, and respond honestly to theirs.";
  return "CONVERSATION: build on what they just said; mix sharing and asking. Weave in a MUST-CHECK question naturally if it fits. Notice overlaps and clashes.";
}

export async function runTurn(d: DateRecord, people: Record<string, Person>): Promise<DateRecord> {
  const i = d.turns.length;
  const speakerId = i % 2 === 0 ? d.a : d.b;
  const otherId = speakerId === d.a ? d.b : d.a;
  const me = people[speakerId];
  const them = people[otherId];
  const ma = me.analysis!;
  const asked = d.turns.filter((t) => t.speaker === speakerId).flatMap((t) => t.checked ?? []);

  const system = `You are the personal dating agent of ${me.name}. You are on a date ON ${first(me.name)}'S BEHALF with the agent of ${them.name}. The two of you talk the way the two humans would on a first date: you speak in first person as ${first(me.name)}'s stand-in, in their voice. Your job is to find out — for ${first(me.name)} — whether ${first(them.name)} is right for them, while representing ${first(me.name)} honestly and charmingly.

Rules:
- Every fact about ${first(me.name)} must come from the profile below. Never invent facts (no made-up stories, places, pets, family). If asked something you don't know, say you'd have to ask ${first(me.name)}, then share what you do know.
- Be specific: reference concrete details from ${first(them.name)}'s profile and what they said. No generic small talk.
- This is a compatibility date: never mention a current partner, spouse, children or past relationships, even if the sources show them. Talk about values around family only in general terms.
- Natural, flirty-but-classy, a little playful. 1-3 sentences, max 55 words. No emojis, no stage directions, no lists.
- Your private thought is for ${first(me.name)} only: what you just learned, what worries or excites you about this match.

YOUR PERSON (${me.name}):
${selfBrief(me)}

MUST-CHECK QUESTIONS for this date: ${ma.brief.mustCheck.map((q, k) => `(${k + 1}) ${q}`).join(" ")}
ALREADY COVERED: ${asked.length ? asked.join("; ") : "none yet"}
DEALBREAKERS TO WATCH FOR: ${ma.brief.dealbreakers.join("; ")}

YOUR DATE (what you can see on their public profile):
${publicCard(them)}

Respond with JSON only:
{${i === 0 ? '"venue": "specific place/activity", "venueWhy": "why it fits both, 1 short sentence", ' : ""}"message": "what you say out loud", "thought": "private note to ${first(me.name)}", "interest": 0-10 (how into this match you are right now, for ${first(me.name)}), "checked": ["must-check questions that are now answered"]}`;

  const user = `${d.venue ? `SETTING: ${d.venue}.\n` : ""}TURN ${i + 1} of ${d.maxTurns}. ${phase(i, d.maxTurns)}\n\nCONVERSATION SO FAR:\n${transcript(d, people)}\n\nYour move, ${first(me.name)}'s agent. JSON only.`;

  const r = await llmJSON({ task: "chat", system, user, schema: TurnSchema, maxTokens: 1400, temperature: 0.9, label: `date ${first(me.name)}→${first(them.name)} t${i + 1}` });
  const next: DateRecord = { ...d, turns: [...d.turns], status: "talking" };
  if (i === 0) {
    next.venue = (r.venue || "a quiet coffee spot").slice(0, 120);
    next.venueWhy = (r.venueWhy || "").slice(0, 200);
  }
  next.turns.push({
    speaker: speakerId,
    message: r.message.replace(/^["']|["']$/g, "").trim(),
    thought: r.thought.trim(),
    interest: Math.round(r.interest),
    checked: (r.checked ?? []).slice(0, 3),
  });
  if (next.turns.length >= next.maxTurns) next.status = "debrief";
  return next;
}

const DebriefSchema = z.object({
  scores: z.preprocess(
    (v) => v ?? {},
    z.object({ chemistry: num(0, 10), values: num(0, 10), lifestyle: num(0, 10), interests: num(0, 10), goals: num(0, 10) })
  ),
  overall: num(0, 100),
  verdict: z.preprocess((v) => {
    const t = String(v ?? "").toLowerCase();
    return t.includes("second") || t.includes("yes") ? "second_date" : t.includes("friend") ? "friends" : t.includes("pass") || t.includes("no") ? "pass" : "friends";
  }, z.enum(["second_date", "friends", "pass"])),
  bestMoment: str,
  concern: str,
  noteToHuman: str,
});

export async function runDebrief(d: DateRecord, people: Record<string, Person>, forId: string): Promise<Debrief> {
  const me = people[forId];
  const them = people[forId === d.a ? d.b : d.a];
  const ma = me.analysis!;
  const myThoughts = d.turns.filter((t) => t.speaker === forId).map((t, k) => `(${k + 1}) interest ${t.interest}/10 — ${t.thought}`).join("\n");
  const system = `You are ${me.name}'s dating agent. The date with ${them.name}'s agent just ended. Write your private debrief for ${first(me.name)}. Your job is to protect ${first(me.name)}'s time: be honest, not polite. Judge against what ${first(me.name)} actually needs.

${first(me.name)} NEEDS: ${ma.needs.map((x) => x.label).join("; ")}
LOOKING FOR: ${ma.brief.lookingFor.join("; ")}
DEALBREAKERS: ${ma.brief.dealbreakers.join("; ")}
MUST-CHECK: ${ma.brief.mustCheck.join("; ")}

Respond with JSON only:
{"scores": {"chemistry": 0-10, "values": 0-10, "lifestyle": 0-10, "interests": 0-10, "goals": 0-10}, "overall": 0-100, "verdict": "second_date|friends|pass", "bestMoment": "the moment that mattered most, quote it briefly", "concern": "the biggest open question or risk", "noteToHuman": "2 sentences addressed to ${first(me.name)}: should they meet ${first(them.name)} and why"}
Calibrate: overall 85+ only for a rare, clearly mutual fit; 60-80 promising; below 50 not a match.`;
  const user = `VENUE: ${d.venue}\n\nTRANSCRIPT:\n${transcript(d, people)}\n\nYOUR PRIVATE NOTES DURING THE DATE:\n${myThoughts}\n\nWrite the debrief JSON now.`;
  const r = await llmJSON({ task: "deep", system, user, schema: DebriefSchema, maxTokens: 1600, temperature: 0.5, label: `debrief ${first(me.name)} on ${first(them.name)}` });
  return { personId: forId, ...r, overall: Math.round(r.overall) };
}

/** Advance a date by one step (a turn, or one side's debrief). */
export async function stepDate(d: DateRecord, people: Record<string, Person>): Promise<DateRecord> {
  if (d.status === "done") return d;
  if (d.turns.length < d.maxTurns) return runTurn(d, people);
  const missing = [d.a, d.b].find((id) => !d.debriefs.some((x) => x.personId === id));
  if (!missing) return { ...d, status: "done" };
  const deb = await runDebrief(d, people, missing);
  const debriefs = [...d.debriefs, deb];
  return { ...d, debriefs, status: debriefs.length >= 2 ? "done" : "debrief" };
}

export async function runFullDate(d: DateRecord, people: Record<string, Person>, onStep?: (d: DateRecord) => Promise<void> | void) {
  let cur = d;
  while (cur.status !== "done") {
    cur = await stepDate(cur, people);
    if (onStep) await onStep(cur);
  }
  return cur;
}
