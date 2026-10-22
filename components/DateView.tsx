"use client";
import { useEffect, useState } from "react";
import type { DateRecord, Person } from "@/lib/types";
import { Avatar, ScoreBar, Verdict, firstName } from "./ui";

type Lite = Pick<Person, "id" | "name" | "avatar">;

export function ChatBubbles({ d, people, showThoughts, upto }: { d: DateRecord; people: Record<string, Lite>; showThoughts: boolean; upto?: number }) {
  const turns = d.turns.slice(0, upto ?? d.turns.length);
  return (
    <div className="space-y-4">
      {turns.map((t, i) => {
        const left = t.speaker === d.a;
        const sp = people[t.speaker];
        if (!sp) return null;
        return (
          <div key={i} className={`fade-in flex gap-3 ${left ? "" : "flex-row-reverse"}`}>
            <Avatar p={sp} size={36} />
            <div className={`max-w-[80%] ${left ? "" : "text-right"}`}>
              <div className="mb-1 text-[11px] text-muted">
                {firstName(sp.name)}&apos;s agent · interest {t.interest}/10
              </div>
              <div className={`inline-block rounded-2xl px-4 py-2.5 text-left text-[15px] leading-relaxed ${left ? "rounded-tl-sm bg-panel2" : "rounded-tr-sm bg-rose/15 border border-rose/30"}`}>
                {t.message}
              </div>
              {showThoughts && t.thought && (
                <div className="mt-1.5 inline-block rounded-xl border border-dashed border-gold/40 px-3 py-1.5 text-left text-xs italic text-gold/90">
                  💭 private note to {firstName(sp.name)}: {t.thought}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function InterestMeter({ d, people }: { d: DateRecord; people: Record<string, Lite> }) {
  const series = [d.a, d.b].map((id) => ({ id, pts: d.turns.filter((t) => t.speaker === id).map((t) => t.interest) }));
  return (
    <div className="space-y-2">
      {series.map((s, k) => (
        <div key={s.id} className="flex items-center gap-2 text-xs">
          <span className="w-16 truncate text-muted">{firstName(people[s.id]?.name ?? "")}</span>
          <div className="flex flex-1 items-end gap-1">
            {s.pts.map((v, i) => (
              <div key={i} className={`w-5 rounded-sm ${k === 0 ? "bg-cream/60" : "bg-rose"}`} style={{ height: 4 + v * 2.6 }} title={`${v}/10`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Debriefs({ d, people }: { d: DateRecord; people: Record<string, Lite> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[d.a, d.b].map((id) => {
        const x = d.debriefs.find((y) => y.personId === id);
        const p = people[id];
        if (!p) return null;
        return (
          <div key={id} className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Avatar p={p} size={32} />
              <div className="flex-1 text-sm font-semibold">{firstName(p.name)}&apos;s agent reports back</div>
              {x && <Verdict v={x.verdict} />}
            </div>
            {!x ? (
              <p className="text-sm text-muted">
                <span className="pulse-dot">●</span> writing debrief…
              </p>
            ) : (
              <>
                <div className="mb-3 flex items-baseline gap-2">
                  <span className="h-display text-4xl text-rose">{x.overall}</span>
                  <span className="text-xs text-muted">/100 overall</span>
                </div>
                <div className="mb-3 grid grid-cols-5 gap-2 text-center text-[10px] text-muted">
                  {Object.entries(x.scores).map(([k, v]) => (
                    <div key={k}>
                      <ScoreBar value={v} max={10} color="bg-gold" />
                      <div className="mt-1">
                        {k} {v}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-cream/90">{x.noteToHuman}</p>
                <p className="mt-2 text-xs text-muted">
                  <b className="text-emerald-400">Best moment:</b> {x.bestMoment}
                </p>
                <p className="mt-1 text-xs text-muted">
                  <b className="text-amber-300">Concern:</b> {x.concern}
                </p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Replays a finished date message by message, like watching it happen. */
export function DateReplay({ d, people }: { d: DateRecord; people: Record<string, Lite> }) {
  const [n, setN] = useState(1);
  const [thoughts, setThoughts] = useState(true);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing) return;
    if (n >= d.turns.length) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setN((x) => x + 1), 2200);
    return () => clearTimeout(t);
  }, [n, playing, d.turns.length]);
  const finished = n >= d.turns.length;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-ghost" onClick={() => { setN(1); setPlaying(true); }}>
          ↺ Replay date
        </button>
        <button className="btn-ghost" onClick={() => { setN(d.turns.length); setPlaying(false); }}>
          Show all
        </button>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={thoughts} onChange={(e) => setThoughts(e.target.checked)} className="accent-rose" />
          Show agents&apos; private thoughts
        </label>
      </div>
      <div className="card p-5">
        <ChatBubbles d={d} people={people} showThoughts={thoughts} upto={n} />
        {!finished && (
          <div className="mt-4 text-sm text-muted">
            <span className="pulse-dot">●</span> {firstName(people[n % 2 === 0 ? d.a : d.b]?.name ?? "")}&apos;s agent is typing…
          </div>
        )}
      </div>
      {finished && (
        <div className="fade-in space-y-4">
          <div className="card p-4">
            <div className="label mb-2">Interest through the date</div>
            <InterestMeter d={d} people={people} />
          </div>
          <Debriefs d={d} people={people} />
        </div>
      )}
    </div>
  );
}
