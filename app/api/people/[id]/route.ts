import { NextResponse } from "next/server";
import { findDate, findPerson } from "@/lib/store";
import type { DateRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

// Current state of a person + their dates + date partners (for the live progress page).
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await findPerson(id);
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const dates = (await Promise.all((p.dateIds ?? []).map((d) => findDate(d)))).filter((d): d is DateRecord => !!d);
  const partnerIds = [...new Set(dates.flatMap((d) => [d.a, d.b]).filter((x) => x !== id))];
  const partners = (await Promise.all(partnerIds.map((x) => findPerson(x)))).filter(Boolean).map((x) => ({
    id: x!.id,
    name: x!.name,
    avatar: x!.avatar,
    tagline: x!.analysis?.tagline,
  }));
  return NextResponse.json({ person: p, dates, partners });
}
