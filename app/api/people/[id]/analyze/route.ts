import { NextResponse } from "next/server";
import { liveStore } from "@/lib/store";
import { analyzePerson } from "@/lib/agents/analyst";

export const maxDuration = 300;

// Step 3: the person's agent reads LinkedIn + Instagram and writes the profile.
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = liveStore();
  const p = await store.getPerson(id);
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (p.analysis) return NextResponse.json({ person: p });
  if (!p.source) return NextResponse.json({ error: "Not scraped yet" }, { status: 409 });
  try {
    p.analysis = await analyzePerson(p);
    p.status = "analyzed";
    p.error = undefined;
    await store.savePerson(p);
    return NextResponse.json({ person: p });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }
}
