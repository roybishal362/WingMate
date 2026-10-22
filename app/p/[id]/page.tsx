import Link from "next/link";
import { notFound } from "next/navigation";
import { findPerson, getPool, type Pool } from "@/lib/store";
import { rankFor } from "@/lib/rank";
import { Avatar, ScoreBar, Section, SourceBadge, TraitList, Verdict, firstName, imgSrc } from "@/components/ui";

export const dynamic = "force-dynamic";

const BIG5_LABEL: Record<string, string> = {
  openness: "Openness",
  conscientiousness: "Conscientiousness",
  extraversion: "Extraversion",
  agreeableness: "Agreeableness",
  emotional_stability: "Emotional stability",
};

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pool?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const pool: Pool = sp.pool === "demo" ? "demo" : "live";
  const q = pool === "demo" ? "?pool=demo" : "";
  const p = await findPerson(id);
  if (!p) notFound();
  const a = p.analysis;
  const src = p.source;
  const ds = await getPool(pool);
  const pm = new Map(ds.people.map((x) => [x.id, x]));
  const dates = ds.dates.filter((d) => d.status === "done" && (d.a === id || d.b === id));
  const top = a ? rankFor(id, ds).slice(0, 3) : [];
  const fn = firstName(p.name);

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="card flex flex-col gap-5 p-6 md:flex-row md:items-center">
        <Avatar p={p} size={112} ring />
        <div className="min-w-0 flex-1">
          <div className="label">Profile written by {fn}&apos;s agent</div>
          <h1 className="h-display mt-1 text-4xl font-semibold">{p.name}</h1>
          {a && <p className="h-display mt-1 text-xl text-rose">“{a.tagline}”</p>}
          <p className="mt-2 text-sm text-muted">
            {p.headline}
            {p.location ? ` · ${p.location}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={p.linkedinUrl} target="_blank" rel="noreferrer" className="chip hover:border-sky">
              <SourceBadge source="linkedin" /> {p.liSlug}
            </a>
            <a href={p.instagramUrl} target="_blank" rel="noreferrer" className="chip hover:border-rose">
              <SourceBadge source="instagram" /> @{p.igUser}
            </a>
            {src && (
              <span className="chip">
                read: {src.linkedin.experience.length} roles · {src.instagram.posts.length} posts
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 md:flex-col">
          <Link href={`/p/${id}/ranking${q}`} className="btn-rose">
            {fn}&apos;s ranking →
          </Link>
          <a href="#dates" className="btn-ghost">
            Dates ({dates.length})
          </a>
        </div>
      </div>

      {!a && (
        <div className="card p-6 text-muted">
          This agent hasn&apos;t finished reading {fn} yet (status: {p.status}).{" "}
          <Link className="text-rose underline" href={`/add/${id}`}>
            Open live progress
          </Link>
        </div>
      )}

      {a && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <Section title={`Who ${fn} is`} className="lg:col-span-2">
              <p className="text-[15px] leading-relaxed text-cream/90">{a.summary}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="label mb-1">Career & ambition</div>
                  <p className="text-sm text-cream/80">{a.career}</p>
                </div>
                <div>
                  <div className="label mb-1">Communication style</div>
                  <p className="text-sm text-cream/80">{a.communicationStyle}</p>
                </div>
              </div>
            </Section>
            <Section title="Personality (inferred)">
              <div className="space-y-3">
                {a.personality.map((x) => (
                  <div key={x.trait} title={x.why}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{BIG5_LABEL[x.trait] ?? x.trait}</span>
                      <span className="text-muted">{x.score}</span>
                    </div>
                    <ScoreBar value={x.score} color="bg-gold" />
                    {x.why && <p className="mt-1 text-[11px] leading-snug text-muted">{x.why}</p>}
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Section title="Needs (in a partner)" className="border-rose/40">
              <TraitList items={a.needs} accent="text-rose" />
            </Section>
            <Section title="Hobbies">
              <TraitList items={a.hobbies} />
            </Section>
            <Section title="Interests">
              <TraitList items={a.interests} />
            </Section>
            <Section title="Values">
              <TraitList items={a.values} />
            </Section>
            <Section title="Lifestyle">
              <TraitList items={a.lifestyle} />
            </Section>
            <Section title="Green flags & friction">
              <ul className="space-y-1.5 text-sm">
                {a.greenFlags.map((g, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-emerald-400">●</span>
                    {g}
                  </li>
                ))}
                {a.friction.map((g, i) => (
                  <li key={`f${i}`} className="flex gap-2 text-cream/80">
                    <span className="text-amber-300">●</span>
                    {g}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title={`The agent's dating brief for ${fn}`} className="border-gold/40">
              <p className="mb-3 text-sm italic text-cream/80">Voice: {a.brief.voice}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="label mb-1">Looking for</div>
                  <ul className="list-disc space-y-1 pl-4 text-sm">{a.brief.lookingFor.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
                <div>
                  <div className="label mb-1">Must-check on every date</div>
                  <ul className="list-decimal space-y-1 pl-4 text-sm">{a.brief.mustCheck.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
                <div>
                  <div className="label mb-1">Dealbreakers</div>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-cream/80">{a.brief.dealbreakers.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
                <div>
                  <div className="label mb-1">First-date ideas</div>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-cream/80">{a.dateIdeas.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
              </div>
            </Section>
            <Section title={`How the agent read ${fn}`}>
              <ol className="relative space-y-3 border-l border-line pl-4">
                {a.readingLog.map((r, i) => (
                  <li key={i} className="fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                    <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-rose/80" />
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <SourceBadge source={r.source} /> {r.item}
                    </div>
                    <p className="text-sm text-cream/90">{r.note}</p>
                  </li>
                ))}
              </ol>
            </Section>
          </div>

          {src && (
            <Section title="What the agent read (the two sources)">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm">
                    <SourceBadge source="linkedin" /> <span className="text-muted">{src.linkedin.headline}</span>
                  </div>
                  {src.linkedin.about && <p className="mb-3 line-clamp-5 text-sm text-cream/80">{src.linkedin.about}</p>}
                  <ul className="space-y-1.5 text-sm">
                    {src.linkedin.experience.slice(0, 6).map((x, i) => (
                      <li key={i} className="flex justify-between gap-3 border-b border-line/50 pb-1.5">
                        <span>
                          <span className="font-medium">{x.title}</span> <span className="text-muted">@ {x.company}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted">{x.duration}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm">
                    <SourceBadge source="instagram" /> <span className="line-clamp-1 text-muted">{src.instagram.bio}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {src.instagram.posts.slice(0, 6).map((post, i) => (
                      <a key={i} href={post.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl border border-line bg-panel2">
                        {post.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgSrc(post.image)} alt={post.alt || "post"} className="aspect-square w-full object-cover" />
                        ) : (
                          <div className="grid aspect-square place-items-center p-2 text-center text-[11px] text-muted">{post.alt || post.type}</div>
                        )}
                        <p className="line-clamp-2 p-1.5 text-[11px] text-cream/70">
                          <span className="text-muted">#{i + 1}</span> {post.caption}
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <Section title={`${fn}'s dates`} className="lg:col-span-2">
              <div id="dates" className="space-y-2">
                {dates.length === 0 && <p className="text-sm text-muted">No finished dates yet.</p>}
                {dates.map((d) => {
                  const otherId = d.a === id ? d.b : d.a;
                  const o = pm.get(otherId);
                  const mine = d.debriefs.find((x) => x.personId === id);
                  const theirs = d.debriefs.find((x) => x.personId === otherId);
                  if (!o) return null;
                  return (
                    <Link key={d.id} href={`/dates/${d.id}${q}`} className="flex items-center gap-3 rounded-xl border border-line bg-panel2 p-3 hover:border-rose/60">
                      <Avatar p={o} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">
                          {fn} × {o.name}
                        </div>
                        <div className="truncate text-xs text-muted">📍 {d.venue}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Verdict v={mine?.verdict} />
                        <span className="text-[11px] text-muted">them: {theirs?.verdict?.replace("_", " ")}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Section>
            <Section title="Best fits so far">
              <ol className="space-y-2">
                {top.map((r, i) => (
                  <li key={r.other.id} className="flex items-center gap-3">
                    <span className="h-display w-5 text-lg text-gold">{i + 1}</span>
                    <Avatar p={r.other} size={34} />
                    <Link href={`/p/${r.other.id}${q}`} className="flex-1 truncate text-sm hover:text-rose">
                      {r.other.name}
                    </Link>
                    <span className="text-sm font-semibold">{r.score}</span>
                  </li>
                ))}
              </ol>
              <Link href={`/p/${id}/ranking${q}`} className="mt-4 block text-sm text-rose hover:underline">
                Full ranking →
              </Link>
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
