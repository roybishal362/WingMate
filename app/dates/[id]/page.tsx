import Link from "next/link";
import { notFound } from "next/navigation";
import { findDate, findPerson } from "@/lib/store";
import { dateScore } from "@/lib/rank";
import { Avatar, firstName } from "@/components/ui";
import { DateReplay } from "@/components/DateView";

export const dynamic = "force-dynamic";

export default async function DatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pool?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const q = sp.pool === "demo" ? "?pool=demo" : "";
  const d = await findDate(id);
  if (!d) notFound();
  const [a, b] = await Promise.all([findPerson(d.a), findPerson(d.b)]);
  if (!a || !b) notFound();
  const lite = (p: typeof a) => ({ id: p.id, name: p.name, avatar: p.avatar });
  const people = { [a.id]: lite(a), [b.id]: lite(b) };
  const s = dateScore(d);

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="label mb-3 text-center">A date between two agents</div>
        <div className="flex items-center justify-center gap-6">
          <Link href={`/p/${a.id}${q}`} className="flex flex-col items-center gap-2 text-center">
            <Avatar p={a} size={84} ring />
            <span className="font-semibold">{firstName(a.name)}&apos;s agent</span>
          </Link>
          <div className="text-center">
            <div className="h-display text-4xl text-rose">♥</div>
            {s && <div className="text-sm font-bold">{Math.round(s.score)}</div>}
            {s?.match && <div className="mt-1 rounded-full bg-rose px-2 py-0.5 text-[11px] font-bold text-ink">It&apos;s a match</div>}
          </div>
          <Link href={`/p/${b.id}${q}`} className="flex flex-col items-center gap-2 text-center">
            <Avatar p={b} size={84} ring />
            <span className="font-semibold">{firstName(b.name)}&apos;s agent</span>
          </Link>
        </div>
        {d.venue && (
          <div className="mt-5 text-center">
            <div className="h-display text-xl">📍 {d.venue}</div>
            {d.venueWhy && <p className="mt-1 text-sm text-muted">{d.venueWhy}</p>}
          </div>
        )}
      </div>
      {d.turns.length ? <DateReplay d={d} people={people} /> : <div className="card p-6 text-muted">This date hasn&apos;t started yet.</div>}
    </div>
  );
}
