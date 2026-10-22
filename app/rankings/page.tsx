import Link from "next/link";
import { getPool } from "@/lib/store";
import { rankFor, ready, topCouples } from "@/lib/rank";
import { Avatar, firstName } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Rankings({ searchParams }: { searchParams: Promise<{ pool?: string }> }) {
  const sp = await searchParams;
  const pool = sp.pool === "demo" ? "demo" : "live";
  const q = pool === "demo" ? "?pool=demo" : "";
  const ds = await getPool(pool);
  const people = ds.people.filter(ready).sort((a, b) => a.name.localeCompare(b.name));
  const couples = topCouples(ds, 10);
  return (
    <div className="space-y-8">
      <div>
        <div className="label">Rankings</div>
        <h1 className="h-display text-4xl font-semibold">Who fits each person best</h1>
        <p className="mt-1 text-muted">Top 3 for every person. Click a name for their full ranking.</p>
      </div>

      <section className="card p-5">
        <h2 className="h-display mb-3 text-2xl">Top 10 couples (mutual date score)</h2>
        <ol className="grid gap-2 md:grid-cols-2">
          {couples.map((c, i) => (
            <li key={c.date.id}>
              <Link href={`/dates/${c.date.id}${q}`} className="flex items-center gap-3 rounded-xl border border-line bg-panel2 p-2.5 hover:border-rose/60">
                <span className="h-display w-6 text-center text-xl text-gold">{i + 1}</span>
                <div className="flex -space-x-2">
                  <Avatar p={c.a} size={32} />
                  <Avatar p={c.b} size={32} />
                </div>
                <span className="flex-1 truncate text-sm">
                  {c.a.name} × {c.b.name}
                </span>
                {c.match && <span className="text-[10px] font-bold text-rose">MATCH</span>}
                <span className="font-bold">{c.score}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {people.map((p) => {
          const top = rankFor(p.id, ds).slice(0, 3);
          return (
            <div key={p.id} className="card p-4">
              <Link href={`/p/${p.id}/ranking${q}`} className="mb-3 flex items-center gap-3 hover:text-rose">
                <Avatar p={p} size={40} />
                <div className="font-semibold">{p.name}</div>
              </Link>
              <ol className="space-y-1.5">
                {top.map((r, i) => (
                  <li key={r.other.id} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-gold">{i + 1}</span>
                    <Avatar p={r.other} size={22} />
                    <span className="flex-1 truncate">{firstName(r.other.name)} {r.other.name.split(" ").slice(1).join(" ")}</span>
                    {r.kind === "dated" && <span className="text-[10px] text-rose">♥</span>}
                    <span className="font-semibold">{r.score}</span>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
}
