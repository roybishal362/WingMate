import Link from "next/link";
import { getPool } from "@/lib/store";
import { dateScore } from "@/lib/rank";
import { Avatar, Verdict, firstName } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Dates({ searchParams }: { searchParams: Promise<{ pool?: string }> }) {
  const sp = await searchParams;
  const pool = sp.pool === "demo" ? "demo" : "live";
  const q = pool === "demo" ? "?pool=demo" : "";
  const ds = await getPool(pool);
  const pm = new Map(ds.people.map((p) => [p.id, p]));
  const dates = ds.dates
    .filter((d) => pm.get(d.a) && pm.get(d.b) && d.turns.length)
    .sort((x, y) => (dateScore(y)?.score ?? 0) - (dateScore(x)?.score ?? 0));
  return (
    <div className="space-y-6">
      <div>
        <div className="label">Date night</div>
        <h1 className="h-display text-4xl font-semibold">Every date the agents went on</h1>
        <p className="mt-1 text-muted">{dates.length} dates · open one to watch it replay, with each agent&apos;s private thoughts and debrief.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {dates.map((d) => {
          const a = pm.get(d.a)!;
          const b = pm.get(d.b)!;
          const s = dateScore(d);
          return (
            <Link key={d.id} href={`/dates/${d.id}${q}`} className="card flex gap-3 p-4 hover:border-rose/60">
              <div className="flex -space-x-3">
                <Avatar p={a} size={44} />
                <Avatar p={b} size={44} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  {firstName(a.name)} × {firstName(b.name)}
                </div>
                <div className="truncate text-xs text-muted">📍 {d.venue}</div>
                <p className="mt-1 line-clamp-2 text-sm text-cream/80">“{d.turns[0]?.message}”</p>
                <div className="mt-2 flex gap-2">
                  {d.debriefs.map((x) => (
                    <Verdict key={x.personId} v={x.verdict} />
                  ))}
                  {d.status !== "done" && <span className="chip">in progress</span>}
                </div>
              </div>
              {s && <div className="text-xl font-bold">{Math.round(s.score)}</div>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
