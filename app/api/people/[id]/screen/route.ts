import { NextResponse } from "next/server";
import { getPool, liveStore } from "@/lib/store";
import { reverseScreen, screen } from "@/lib/agents/screener";
import { initiator, mutualSwipe, newDate, swipeMap } from "@/lib/pairing";
import { ready } from "@/lib/rank";

export const maxDuration = 300;
const DATES_PER_NEWCOMER = 3;

// Step 4: the new agent swipes on everyone, everyone's agents swipe on the newcomer,
// then the best mutual candidates get a date.
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = liveStore();
  const p = await store.getPerson(id);
  if (!p?.analysis) return NextResponse.json({ error: "Not analyzed yet" }, { status: 409 });
  if (p.dateIds?.length) return NextResponse.json({ person: p });

  const ds = await getPool("live");
  const others = ds.people.filter((x) => x.id !== id && ready(x));
  try {
    const [mine, theirs] = await Promise.all([screen(p, others), reverseScreen(p, others)]);
    await store.saveSwipes([...mine, ...theirs]);
    const sm = swipeMap([...mine, ...theirs]);
    const ranked = others
      .map((o) => ({ o, s: mutualSwipe(sm, id, o.id) ?? 0 }))
      .sort((x, y) => y.s - x.s)
      .slice(0, DATES_PER_NEWCOMER);
    const dates = ranked.map(({ o }) => {
      const [a, b] = initiator(sm, id, o.id);
      return newDate(a, b, "live");
    });
    for (const d of dates) await store.saveDate(d);
    p.dateIds = dates.map((d) => d.id);
    p.status = "screened";
    await store.savePerson(p);
    return NextResponse.json({
      person: p,
      swipes: mine.sort((x, y) => y.score - x.score).slice(0, 8),
      partners: ranked.map(({ o, s }) => ({ id: o.id, name: o.name, avatar: o.avatar, tagline: o.analysis?.tagline, score: Math.round(s) })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }
}
