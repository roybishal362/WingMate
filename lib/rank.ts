import { mutualSwipe, swipeMap } from "./pairing";
import type { Dataset, DateRecord, Debrief, Person, Swipe } from "./types";

export type RankRow = {
  other: Person;
  score: number;
  kind: "dated" | "screened";
  mine?: Swipe;
  theirs?: Swipe;
  date?: DateRecord;
  myDebrief?: Debrief;
  theirDebrief?: Debrief;
  mutualDate?: number;
  swipe?: number;
  match: boolean;
};

export const ready = (p: Person) => !!p.analysis && p.status !== "error";

export function dateScore(d: DateRecord): { score: number; match: boolean } | null {
  if (d.status !== "done" || d.debriefs.length < 2) return null;
  const [x, y] = d.debriefs;
  const score = Math.sqrt(Math.max(1, x.overall) * Math.max(1, y.overall));
  return { score, match: x.verdict === "second_date" && y.verdict === "second_date" };
}

/** Everyone ranked for one person: dated pairs by both agents' verdicts, the rest by mutual swipe. */
export function rankFor(id: string, ds: Dataset): RankRow[] {
  const sm = swipeMap(ds.swipes);
  const mine = ds.dates.filter((d) => d.status === "done" && (d.a === id || d.b === id));
  const rows: RankRow[] = [];
  for (const o of ds.people) {
    if (o.id === id || !ready(o)) continue;
    const swipe = mutualSwipe(sm, id, o.id);
    const date = mine.find((d) => d.a === o.id || d.b === o.id);
    const base = { other: o, mine: sm.get(`${id}|${o.id}`), theirs: sm.get(`${o.id}|${id}`), swipe: swipe ?? undefined };
    const ds_ = date ? dateScore(date) : null;
    if (date && ds_) {
      const myDebrief = date.debriefs.find((x) => x.personId === id);
      const theirDebrief = date.debriefs.find((x) => x.personId === o.id);
      const score = Math.min(99, 0.75 * ds_.score + 0.25 * (swipe ?? ds_.score) + (ds_.match ? 3 : 0));
      rows.push({ ...base, kind: "dated", date, myDebrief, theirDebrief, mutualDate: ds_.score, score: Math.round(score), match: ds_.match });
    } else if (swipe != null) {
      rows.push({ ...base, kind: "screened", score: Math.round(0.85 * swipe), match: false });
    }
  }
  return rows.sort((a, b) => b.score - a.score || (a.kind === "dated" ? -1 : 1));
}

export function topCouples(ds: Dataset, n = 10) {
  const pm = new Map(ds.people.map((p) => [p.id, p]));
  return ds.dates
    .map((d) => ({ d, r: dateScore(d) }))
    .filter((x) => x.r && pm.get(x.d.a) && pm.get(x.d.b))
    .map((x) => ({ date: x.d, a: pm.get(x.d.a)!, b: pm.get(x.d.b)!, score: Math.round(x.r!.score), match: x.r!.match }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
