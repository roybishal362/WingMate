import Link from "next/link";
import type { Person, Trait } from "@/lib/types";

export const imgSrc = (src?: string) => (!src ? "" : src.startsWith("http") ? `/api/img?u=${encodeURIComponent(src)}` : src);
export const firstName = (n: string) => n.split(" ")[0];

export function Avatar({ p, size = 48, ring = false }: { p: Pick<Person, "name" | "avatar">; size?: number; ring?: boolean }) {
  const initials = p.name
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
  return p.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc(p.avatar)}
      alt={p.name}
      width={size}
      height={size}
      className={`shrink-0 rounded-full object-cover ${ring ? "ring-2 ring-rose/70 ring-offset-2 ring-offset-ink" : ""}`}
      style={{ width: size, height: size }}
    />
  ) : (
    <div className="grid shrink-0 place-items-center rounded-full bg-panel2 font-semibold text-gold" style={{ width: size, height: size }}>
      {initials}
    </div>
  );
}

export function SourceBadge({ source }: { source: "linkedin" | "instagram" }) {
  return source === "linkedin" ? (
    <span className="rounded bg-sky-soft px-1.5 py-0.5 text-[10px] font-bold text-sky">LinkedIn</span>
  ) : (
    <span className="rounded bg-rose-soft px-1.5 py-0.5 text-[10px] font-bold text-rose">Instagram</span>
  );
}

export function ScoreBar({ value, max = 100, color = "bg-rose" }: { value: number; max?: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-panel2">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(3, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  );
}

export function TraitList({ items, accent = "text-gold" }: { items: Trait[]; accent?: string }) {
  return (
    <ul className="space-y-3">
      {items.map((t, i) => (
        <li key={i} className="fade-in">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${accent}`}>{t.label}</span>
            <span
              title={`confidence: ${t.confidence}`}
              className={`h-1.5 w-1.5 rounded-full ${t.confidence === "high" ? "bg-emerald-400" : t.confidence === "medium" ? "bg-amber-300" : "bg-zinc-500"}`}
            />
          </div>
          {t.detail && <p className="mt-0.5 text-sm text-cream/80">{t.detail}</p>}
          {t.evidence?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {t.evidence.slice(0, 2).map((e, k) => (
                <span key={k} className="inline-flex max-w-full items-center gap-1 text-[11px] text-muted">
                  <SourceBadge source={e.source} />
                  <span className="truncate">{e.ref}</span>
                </span>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className}`}>
      <h3 className="label mb-3">{title}</h3>
      {children}
    </section>
  );
}

export function PersonCard({ p, q = "" }: { p: Person; q?: string }) {
  const a = p.analysis;
  return (
    <Link href={`/p/${p.id}${q}`} className="card group flex flex-col gap-3 p-4 transition hover:border-rose/60">
      <div className="flex items-center gap-3">
        <Avatar p={p} size={52} />
        <div className="min-w-0">
          <div className="truncate font-semibold">{p.name}</div>
          <div className="truncate text-xs text-muted">{p.headline}</div>
        </div>
      </div>
      {a && <p className="h-display text-[15px] leading-snug text-cream/90">“{a.tagline}”</p>}
      {a && (
        <div className="flex flex-wrap gap-1.5">
          {[...a.hobbies.slice(0, 2), ...a.interests.slice(0, 2)].map((t, i) => (
            <span key={i} className="chip">
              {t.label}
            </span>
          ))}
        </div>
      )}
      {!a && <span className="chip w-fit">{p.status}</span>}
    </Link>
  );
}

export function Verdict({ v }: { v?: string }) {
  if (!v) return null;
  const map: Record<string, [string, string]> = {
    second_date: ["Second date ♥", "bg-rose text-ink"],
    friends: ["Friends", "bg-gold text-ink"],
    pass: ["Pass", "bg-panel2 text-muted border border-line"],
  };
  const [t, c] = map[v] ?? [v, "bg-panel2"];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${c}`}>{t}</span>;
}
