import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { loadDemo, liveStore, RedisStore } from "@/lib/store";

export const dynamic = "force-dynamic";

// Quick deployment check: which keys are configured and which storage is active.
export async function GET() {
  const demo = loadDemo();
  return NextResponse.json({
    storage: liveStore() instanceof RedisStore ? "redis (persistent)" : "local files (NOT shared between serverless instances — connect Upstash Redis)",
    keys: { apify: !!env.apifyToken(), groq: !!env.groqKey(), gemini: !!env.geminiKey(), cerebras: !!env.cerebrasKey() },
    demo: { people: demo.people.length, dates: demo.dates.length, swipes: demo.swipes.length },
  });
}
