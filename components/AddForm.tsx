"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddForm() {
  const router = useRouter();
  const [li, setLi] = useState("");
  const [ig, setIg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/people", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ linkedin: li, instagram: ig }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Something went wrong");
      router.push(j.existing && j.ready ? `/p/${j.id}` : `/add/${j.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <div className="label">Add a real person</div>
      <input
        value={li}
        onChange={(e) => setLi(e.target.value)}
        required
        placeholder="https://www.linkedin.com/in/…"
        className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm outline-none focus:border-sky"
      />
      <input
        value={ig}
        onChange={(e) => setIg(e.target.value)}
        required
        placeholder="https://www.instagram.com/… (public profile)"
        className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm outline-none focus:border-rose"
      />
      <button disabled={busy} className="btn-rose w-full disabled:opacity-60">
        {busy ? "Starting the scrapers…" : "Create their agent & send it dating →"}
      </button>
      {err && <p className="text-sm text-rose">{err}</p>}
      <p className="text-xs text-muted">Takes ~2–4 minutes on free AI: scrape → read → swipe → 3 live dates → ranking.</p>
    </form>
  );
}
