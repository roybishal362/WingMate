import type { DateRecord, Person, Swipe } from "./types";

export function swipeMap(swipes: Swipe[]) {
  const m = new Map<string, Swipe>();
  for (const s of swipes) m.set(`${s.from}|${s.to}`, s);
  return m;
}

export function mutualSwipe(m: Map<string, Swipe>, a: string, b: string): number | null {
  const x = m.get(`${a}|${b}`)?.score;
  const y = m.get(`${b}|${a}`)?.score;
  if (x == null && y == null) return null;
  if (x == null) return y!;
  if (y == null) return x;
  return (x + y) / 2;
}

/** Pick date pairs so everyone gets at least `min` dates, preferring the highest mutual interest. */
export function choosePairs(people: Person[], swipes: Swipe[], min = 3, max = 4): [string, string][] {
  const m = swipeMap(swipes);
  const all: { a: string; b: string; s: number }[] = [];
  for (let i = 0; i < people.length; i++)
    for (let j = i + 1; j < people.length; j++) {
      const s = mutualSwipe(m, people[i].id, people[j].id);
      if (s != null) all.push({ a: people[i].id, b: people[j].id, s });
    }
  all.sort((x, y) => y.s - x.s);
  const count = new Map<string, number>();
  const c = (id: string) => count.get(id) ?? 0;
  const chosen: [string, string][] = [];
  const used = new Set<string>();
  const add = (a: string, b: string) => {
    chosen.push([a, b]);
    used.add(`${a}|${b}`);
    count.set(a, c(a) + 1);
    count.set(b, c(b) + 1);
  };
  for (const p of all) if ((c(p.a) < min || c(p.b) < min) && c(p.a) < max && c(p.b) < max) add(p.a, p.b);
  // anyone still short gets their best remaining option even if the partner is at max
  for (const person of people) {
    for (const p of all) {
      if (c(person.id) >= min) break;
      if ((p.a === person.id || p.b === person.id) && !used.has(`${p.a}|${p.b}`)) add(p.a, p.b);
    }
  }
  return chosen;
}

/** Who should open the date: the agent that was keener in the swipe round. */
export function initiator(m: Map<string, Swipe>, a: string, b: string): [string, string] {
  const ab = m.get(`${a}|${b}`)?.score ?? 0;
  const ba = m.get(`${b}|${a}`)?.score ?? 0;
  return ab >= ba ? [a, b] : [b, a];
}

export function newDate(a: string, b: string, origin: "demo" | "live"): DateRecord {
  return {
    id: `d-${a.slice(0, 10)}-${b.slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`,
    a,
    b,
    venue: "",
    venueWhy: "",
    turns: [],
    debriefs: [],
    status: "pending",
    maxTurns: 6,
    createdAt: Date.now(),
    origin,
  };
}
