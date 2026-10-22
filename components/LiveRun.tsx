"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { DateRecord, Person, Swipe } from "@/lib/types";
import { Avatar, SourceBadge, TraitList, firstName, imgSrc } from "./ui";
import { ChatBubbles, Debriefs } from "./DateView";

type Lite = { id: string; name: string; avatar?: string; tagline?: string; score?: number };
type Phase = "scraping" | "reading" | "swiping" | "dating" | "done" | "error";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post(url: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return j;
    if (r.status === 503 && attempt < 3) {
      await sleep(5000);
      continue; // free-tier AI busy: try again
    }
    throw new Error(j.error || `Request failed (${r.status})`);
  }
}

export function LiveRun({ id }: { id: string }) {
  const [phase, setPhase] = useState<Phase>("scraping");
  const [person, setPerson] = useState<Person | null>(null);
  const [runs, setRuns] = useState<{ li?: string; ig?: string }>({});
  const [swipes, setSwipes] = useState<Swipe[]>([]);
  const [partners, setPartners] = useState<Record<string, Lite>>({});
  const [dates, setDates] = useState<Record<string, DateRecord>>({});
  const [err, setErr] = useState("");
  const [scan, setScan] = useState(0);
  const [t0] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const started = useRef(false);

  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      setScan((x) => x + 1);
    }, 900);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        let j = await (await fetch(`/api/people/${id}`)).json();
        if (j.error) throw new Error(j.error);
        let p: Person = j.person;
        setPerson(p);
        const pm: Record<string, Lite> = {};
        for (const x of j.partners ?? []) pm[x.id] = x;
        setPartners(pm);

        // 1) scraping
        while (p.status === "scraping") {
          const r = await post(`/api/people/${id}/scrape`);
          p = r.person;
          setPerson(p);
          setRuns({ li: r.li, ig: r.ig });
          if (p.status === "scraping") await sleep(4000);
        }
        if (p.status === "error") throw new Error(p.error || "Scraping failed");

        // 2) reading
        if (!p.analysis) {
          setPhase("reading");
          const r = await post(`/api/people/${id}/analyze`);
          p = r.person;
          setPerson(p);
        }

        // 3) swiping
        if (!p.dateIds?.length) {
          setPhase("swiping");
          const r = await post(`/api/people/${id}/screen`);
          p = r.person;
          setPerson(p);
          setSwipes(r.swipes ?? []);
          const m: Record<string, Lite> = {};
          for (const x of r.partners ?? []) m[x.id] = x;
          setPartners(m);
          await sleep(2500);
        }

        // 4) dating — all dates run side by side, one move at a time
        setPhase("dating");
        j = await (await fetch(`/api/people/${id}`)).json();
        const pm2: Record<string, Lite> = {};
        for (const x of j.partners ?? []) pm2[x.id] = x;
        setPartners((old) => ({ ...pm2, ...old }));
        const init: Record<string, DateRecord> = {};
        for (const d of j.dates as DateRecord[]) init[d.id] = d;
        setDates(init);
        await Promise.all(
          (j.dates as DateRecord[]).map(async (d0) => {
            let d = d0;
            let fails = 0;
            while (d.status !== "done") {
              try {
                const r = await post(`/api/dates/${d.id}/turn`);
                d = r.date;
                setDates((old) => ({ ...old, [d.id]: d }));
              } catch (e) {
                if (++fails > 3) throw e;
                await sleep(6000);
              }
            }
          })
        );
        setPhase("done");
      } catch (e) {
        setErr((e as Error).message);
        setPhase("error");
      }
    })();
  }, [id]);

  const a = person?.analysis;
  const src = person?.source;
  const fn = person ? firstName(person.name) : "";
  const lite: Record<string, Lite> = { ...partners };
  if (person) lite[person.id] = { id: person.id, name: person.name, avatar: person.avatar };
  const steps: [Phase, string][] = [
    ["scraping", "Apify scrapes LinkedIn + Instagram"],
    ["reading", "The agent reads the person"],
    ["swiping", "Agents swipe"],
    ["dating", "Agents go on dates"],
    ["done", "Ranking ready"],
  ];
  const idx = steps.findIndex((s) => s[0] === phase);
  const scanItems = src ? [...src.linkedin.experience.slice(0, 4).map((x) => `LinkedIn · ${x.title} @ ${x.company}`), ...src.instagram.posts.slice(0, 8).map((x, i) => `Instagram post ${i + 1} · ${x.caption.slice(0, 70)}`)] : [];

  return (
    <div className="space-y-6">
      <div className="card flex items-center gap-4 p-5">
        {person && <Avatar p={person} size={64} ring />}
        <div className="flex-1">
          <div className="label">Live · {Math.round((now - t0) / 1000)}s</div>
          <h1 className="h-display text-3xl font-semibold">{person?.analysis ? person.name : person ? `@${person.igUser}` : "Loading…"}</h1>
          {a && <p className="text-rose">“{a.tagline}”</p>}
        </div>
        {phase === "done" && (
          <div className="flex gap-2">
            <Link href={`/p/${id}`} className="btn-ghost">
              Profile
            </Link>
            <Link href={`/p/${id}/ranking`} className="btn-rose">
              See {fn}&apos;s ranking →
            </Link>
          </div>
        )}
      </div>

      <ol className="grid gap-2 md:grid-cols-5">
        {steps.map(([k, label], i) => (
          <li key={k} className={`card p-3 text-sm ${phase === "error" ? "" : i < idx || phase === "done" ? "border-emerald-500/40" : i === idx ? "scan border-rose/60" : "opacity-50"}`}>
            <span className="mr-1">{phase !== "error" && (i < idx || phase === "done") ? "✓" : i === idx ? "●" : "○"}</span>
            {label}
          </li>
        ))}
      </ol>

      {err && (
        <div className="card border-rose p-5 text-rose">
          {err}{" "}
          <Link href="/" className="underline">
            Try other links
          </Link>
        </div>
      )}

      {phase === "scraping" && !err && (
        <div className="card space-y-2 p-5 text-sm">
          <p>
            <SourceBadge source="linkedin" /> Apify run <code className="text-muted">{person?.apify?.liRunId}</code> — {runs.li ?? "starting"}
          </p>
          <p>
            <SourceBadge source="instagram" /> Apify run <code className="text-muted">{person?.apify?.igRunId}</code> — {runs.ig ?? "starting"}
          </p>
          <p className="text-muted">
            <span className="pulse-dot">●</span> Scraping public profiles… (usually 20–60s)
          </p>
        </div>
      )}

      {phase === "reading" && src && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <div className="label mb-3">The agent is reading {firstName(src.linkedin.fullName || person!.name)}…</div>
            <ul className="space-y-1.5 text-sm">
              {scanItems.map((s, i) => (
                <li key={i} className={`truncate rounded-lg px-2 py-1 ${i === scan % scanItems.length ? "scan bg-rose/15 text-cream" : "text-muted"}`}>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5">
            <div className="grid grid-cols-3 gap-2">
              {src.instagram.posts.slice(0, 6).map((p, i) => (
                <div key={i} className={`overflow-hidden rounded-lg border ${i === scan % 6 ? "scan border-rose" : "border-line"}`}>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgSrc(p.image)} alt="" className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="grid aspect-square place-items-center p-1 text-[10px] text-muted">{p.alt || p.type}</div>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted">{src.linkedin.headline}</p>
          </div>
        </div>
      )}

      {a && (phase === "swiping" || phase === "dating" || phase === "done") && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card p-5">
            <div className="label mb-2">Needs</div>
            <TraitList items={a.needs.slice(0, 3)} accent="text-rose" />
          </div>
          <div className="card p-5">
            <div className="label mb-2">Hobbies & interests</div>
            <div className="flex flex-wrap gap-1.5">
              {[...a.hobbies, ...a.interests].slice(0, 10).map((t, i) => (
                <span key={i} className="chip">
                  {t.label}
                </span>
              ))}
            </div>
            <Link href={`/p/${id}`} className="mt-3 block text-sm text-rose hover:underline">
              Full profile with evidence →
            </Link>
          </div>
          <div className="card p-5">
            <div className="label mb-2">The agent&apos;s reading notes</div>
            <ul className="space-y-1.5 text-xs text-cream/80">
              {a.readingLog.slice(0, 5).map((r, i) => (
                <li key={i} className="fade-in">
                  <SourceBadge source={r.source} /> {r.note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {phase === "swiping" && (
        <div className="card p-5">
          <div className="label mb-2">
            <span className="pulse-dot">●</span> {fn}&apos;s agent is swiping through everyone — and everyone&apos;s agents are swiping on {fn}
          </div>
        </div>
      )}

      {swipes.length > 0 && phase !== "done" && (
        <div className="card p-5">
          <div className="label mb-3">Who {fn}&apos;s agent wants to meet</div>
          <div className="grid gap-2 md:grid-cols-2">
            {swipes.slice(0, 6).map((s) => (
              <div key={s.to} className="fade-in flex items-center gap-3 text-sm">
                <span className="w-8 font-bold text-rose">{s.score}</span>
                <span className="text-cream/80">{s.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(dates).length > 0 && (
        <div className="space-y-3">
          <h2 className="h-display text-2xl">{phase === "done" ? "The dates" : "Dates happening now"}</h2>
          <div className="grid gap-4 xl:grid-cols-3">
            {Object.values(dates).map((d) => {
              const other = lite[d.a === id ? d.b : d.a];
              return (
                <div key={d.id} className="card flex flex-col p-4">
                  <div className="mb-3 flex items-center gap-2">
                    {person && <Avatar p={person} size={30} />}
                    <span className="text-rose">♥</span>
                    {other && <Avatar p={other} size={30} />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {fn} × {other ? firstName(other.name) : "…"}
                      </div>
                      <div className="truncate text-[11px] text-muted">{d.venue ? `📍 ${d.venue}` : "choosing a venue…"}</div>
                    </div>
                    <Link href={`/dates/${d.id}`} className="text-xs text-rose">
                      open
                    </Link>
                  </div>
                  <div className="max-h-[460px] flex-1 overflow-y-auto pr-1">
                    <ChatBubbles d={d} people={lite} showThoughts />
                    {d.status !== "done" && (
                      <p className="mt-3 text-xs text-muted">
                        <span className="pulse-dot">●</span>{" "}
                        {d.turns.length < d.maxTurns ? `turn ${d.turns.length + 1}/${d.maxTurns}…` : "agents are writing their debriefs…"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {phase === "done" &&
            Object.values(dates).map((d) => (
              <div key={d.id} className="fade-in">
                <Debriefs d={d} people={lite} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
