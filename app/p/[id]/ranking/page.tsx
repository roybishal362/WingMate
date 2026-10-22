import Link from "next/link";
import { notFound } from "next/navigation";
import { findPerson, getPool, type Pool } from "@/lib/store";
import { rankFor } from "@/lib/rank";
import { Avatar, ScoreBar, Verdict, firstName } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RankingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pool?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const pool: Pool = sp.pool === "demo" ? "demo" : "live";
  const q = pool === "demo" ? "?pool=demo" : "";
  const p = await findPerson(id);
  if (!p) notFound();
  const ds = await getPool(pool);
  const rows = rankFor(id, ds);
  const fn = firstName(p.name);
  const dated = rows.filter((r) => r.kind === "dated").length;

  return (
    <div className="space-y-6">
      <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <Avatar p={p} size={84} ring />
        <div className="flex-1">
          <div className="label">Ranking · who fits {fn} best</div>
          <h1 className="h-display text-3xl font-semibold">{p.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {rows.length} people ranked · {dated} went on a real date with {fn}&apos;s agent · the rest ranked from the swipe round
          </p>
        </div>
        <Link href={`/p/${id}${q}`} className="btn-ghost">
          ← Profile
        </Link>
      </div>

      <div className="card p-4 text-xs text-muted">
        <b className="text-cream">How the score works:</b> dated pairs = geometric mean of <i>both</i> agents&apos; post-date verdicts (so it only scores high if it&apos;s
        mutual), blended 75/25 with the mutual swipe score, +3 if both agents asked for a second date. Not-yet-dated people are ranked from the mutual swipe score × 0.85.
      </div>

      <ol className="space-y-3">
        {rows.map((r, i) => (
          <li key={r.other.id} className={`card fade-in p-4 ${i < 3 ? "border-rose/40" : ""}`} style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-3 md:w-72">
                <span className={`h-display w-9 text-center text-3xl ${i < 3 ? "text-rose" : "text-muted"}`}>{i + 1}</span>
                <Avatar p={r.other} size={48} />
                <div className="min-w-0">
                  <Link href={`/p/${r.other.id}${q}`} className="block truncate font-semibold hover:text-rose">
                    {r.other.name}
                  </Link>
                  <div className="truncate text-xs text-muted">{r.other.analysis?.tagline}</div>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <ScoreBar value={r.score} color={r.kind === "dated" ? "bg-rose" : "bg-gold/70"} />
                  </div>
                  <span className="w-10 text-right text-lg font-bold">{r.score}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {r.kind === "dated" ? <span className="chip border-rose/50">♥ dated</span> : <span className="chip">screened only</span>}
                  {r.match && <span className="rounded-full bg-rose px-2 py-0.5 font-bold text-ink">It&apos;s a match</span>}
                  {r.kind === "dated" && (
                    <>
                      <span className="text-muted">{fn}&apos;s agent:</span> <Verdict v={r.myDebrief?.verdict} />
                      <span className="text-muted">{firstName(r.other.name)}&apos;s agent:</span> <Verdict v={r.theirDebrief?.verdict} />
                    </>
                  )}
                  {r.swipe != null && <span className="text-muted">swipe {Math.round(r.swipe)}</span>}
                </div>
                <p className="text-sm text-cream/80">
                  {r.kind === "dated" ? r.myDebrief?.noteToHuman : r.mine?.reason || r.theirs?.reason}
                </p>
              </div>
              {r.date && (
                <Link href={`/dates/${r.date.id}${q}`} className="btn-ghost shrink-0">
                  Watch the date →
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
