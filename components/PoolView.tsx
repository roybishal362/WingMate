import Link from "next/link";
import type { Dataset } from "@/lib/types";
import { topCouples, ready } from "@/lib/rank";
import { Avatar, PersonCard, firstName } from "./ui";

export function Steps() {
  const steps = [
    ["1", "Paste two links", "A LinkedIn and a public Instagram. Nothing else."],
    ["2", "Apify scrapes both", "Profile, roles, education, skills · bio, 12 latest posts, captions, photo descriptions."],
    ["3", "The agent reads its person", "Needs, hobbies, interests, values, personality — every trait backed by evidence."],
    ["4", "Agents swipe, then date", "Each agent rates everyone, then goes on real multi-turn dates on its person's behalf."],
    ["5", "Everyone gets a ranking", "Both agents debrief after each date. Mutual verdicts decide who fits best."],
  ];
  return (
    <div className="grid gap-3 md:grid-cols-5">
      {steps.map(([n, t, d]) => (
        <div key={n} className="card p-4">
          <div className="h-display text-2xl text-rose">{n}</div>
          <div className="mt-1 font-semibold">{t}</div>
          <p className="mt-1 text-xs leading-relaxed text-muted">{d}</p>
        </div>
      ))}
    </div>
  );
}

export function PoolView({ ds, q = "" }: { ds: Dataset; q?: string }) {
  const people = ds.people.filter(ready).sort((a, b) => (a.origin === b.origin ? a.name.localeCompare(b.name) : a.origin === "live" ? -1 : 1));
  const done = ds.dates.filter((d) => d.status === "done");
  const couples = topCouples(ds, 6);
  const matches = done.filter((d) => d.debriefs.length === 2 && d.debriefs.every((x) => x.verdict === "second_date")).length;
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-3 gap-3">
        {[
          [people.length, "people, each with an agent"],
          [done.length, "dates the agents went on"],
          [matches, "mutual second-date matches"],
        ].map(([n, l]) => (
          <div key={String(l)} className="card p-4 text-center">
            <div className="h-display text-4xl text-rose">{n}</div>
            <div className="text-xs text-muted">{l}</div>
          </div>
        ))}
      </div>

      {couples.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="h-display text-2xl">Top couples</h2>
            <Link href={`/rankings${q}`} className="text-sm text-rose hover:underline">
              All rankings →
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {couples.map((c) => (
              <Link key={c.date.id} href={`/dates/${c.date.id}${q}`} className="card flex items-center gap-3 p-4 hover:border-rose/60">
                <div className="flex -space-x-3">
                  <Avatar p={c.a} size={44} />
                  <Avatar p={c.b} size={44} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {firstName(c.a.name)} × {firstName(c.b.name)}
                  </div>
                  <div className="truncate text-xs text-muted">📍 {c.date.venue}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{c.score}</div>
                  {c.match && <div className="text-[10px] font-bold text-rose">MATCH</div>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="h-display mb-3 text-2xl">The people &amp; their agents</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {people.map((p) => (
            <PersonCard key={p.id} p={p} q={q} />
          ))}
        </div>
      </section>
    </div>
  );
}
