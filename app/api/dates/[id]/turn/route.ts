import { NextResponse } from "next/server";
import { findPerson, liveStore } from "@/lib/store";
import { stepDate } from "@/lib/agents/dater";
import type { Person } from "@/lib/types";

export const maxDuration = 300;

// Step 5: advance a live date by one move — one agent speaks, or one agent writes its debrief.
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = liveStore();
  const d = await store.getDate(id);
  if (!d) return NextResponse.json({ error: "Live date not found" }, { status: 404 });
  if (d.status === "done") return NextResponse.json({ date: d });
  const [a, b] = await Promise.all([findPerson(d.a), findPerson(d.b)]);
  if (!a?.analysis || !b?.analysis) return NextResponse.json({ error: "Both agents must have read their people first" }, { status: 409 });
  const people: Record<string, Person> = { [a.id]: a, [b.id]: b };
  try {
    const next = await stepDate(d, people);
    await store.saveDate(next);
    if (next.status === "done") {
      for (const pid of [d.a, d.b]) {
        const p = await store.getPerson(pid);
        if (p && p.origin === "live" && p.dateIds?.length) {
          const all = await Promise.all(p.dateIds.map((x) => store.getDate(x)));
          if (all.every((x) => x?.status === "done")) {
            p.status = "ready";
            await store.savePerson(p);
          }
        }
      }
    }
    return NextResponse.json({ date: next });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, date: d }, { status: 503 });
  }
}
