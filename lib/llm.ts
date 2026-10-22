// Free-tier AI router: spreads calls across Groq + Cerebras models,
// paces each endpoint under its per-minute limits, and fails over on 429s.
import OpenAI from "openai";
import { z } from "zod";
import { env } from "./env";

type Endpoint = {
  id: string;
  model: string;
  client: OpenAI;
  rpm: number;
  tpm: number;
  reasoning: boolean;
  chatRank: number; // lower = preferred for date conversation
  deepRank: number; // lower = preferred for analysis / judgement
  log: { t: number; tokens: number }[];
  cooldownUntil: number;
  disabledUntil: number;
  noJsonMode?: boolean;
  maxOut?: number; // hard output-token cap for this endpoint (e.g. Groq qwen OTPM 1000)
};

let ENDPOINTS: Endpoint[] | null = null;

// Free tier, no card. Override with GEMINI_MODELS="id:rpm,id:rpm" if Google renames models.
const GEMINI_MODELS: { id: string; rpm: number; tpm: number; chat: number; deep: number }[] = (
  process.env.GEMINI_MODELS
    ? process.env.GEMINI_MODELS.split(",").map((x, i) => {
        const [id, rpm] = x.split(":");
        return { id, rpm: Number(rpm) || 10, tpm: 250000, chat: i, deep: i };
      })
    : [
        { id: "gemini-2.5-flash", rpm: 9, tpm: 240000, chat: 2, deep: 0 },
        { id: "gemini-2.5-flash-lite", rpm: 14, tpm: 240000, chat: 0, deep: 3 },
        { id: "gemini-2.0-flash", rpm: 14, tpm: 900000, chat: 1, deep: 2 },
      ]
);

function ep(
  provider: string,
  model: string,
  client: OpenAI,
  rpm: number,
  tpm: number,
  reasoning: boolean,
  chatRank: number,
  deepRank: number
): Endpoint {
  return {
    id: `${provider}:${model}`,
    model,
    client,
    rpm,
    tpm,
    reasoning,
    chatRank,
    deepRank,
    log: [],
    cooldownUntil: 0,
    disabledUntil: 0,
  };
}

function endpoints(): Endpoint[] {
  if (ENDPOINTS) return ENDPOINTS;
  const list: Endpoint[] = [];
  const cer = env.cerebrasKey();
  const groq = env.groqKey();
  const gem = env.geminiKey();
  if (gem) {
    const gm = new OpenAI({ apiKey: gem, baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", maxRetries: 0, timeout: 120_000 });
    for (const m of GEMINI_MODELS) list.push(ep("gemini", m.id, gm, m.rpm, m.tpm, false, m.chat, m.deep));
  }
  if (cer) {
    const c = new OpenAI({ apiKey: cer, baseURL: "https://api.cerebras.ai/v1", maxRetries: 0, timeout: 120_000 });
    list.push(ep("cerebras", "gpt-oss-120b", c, 5, 30000, true, 2, 1));
    list.push(ep("cerebras", "qwen-3.8-27b", c, 5, 30000, false, 4, 3));
  }
  if (groq) {
    const g = new OpenAI({ apiKey: groq, baseURL: "https://api.groq.com/openai/v1", maxRetries: 0, timeout: 120_000 });
    list.push(ep("groq", "openai/gpt-oss-120b", g, 30, 8000, true, 1, 2));
    list.push({ ...ep("groq", "qwen/qwen3.8-27b", g, 30, 8000, false, 3, 9), maxOut: 900 });
    list.push(ep("groq", "openai/gpt-oss-20b", g, 30, 8000, true, 5, 5));
  }
  if (!list.length) throw new Error("No AI key configured (GROQ_API_KEY / CEREBRAS_API_KEY).");
  ENDPOINTS = list;
  return list;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function usage(e: Endpoint, now: number) {
  e.log = e.log.filter((x) => now - x.t < 60_000);
  return { reqs: e.log.length, tokens: e.log.reduce((s, x) => s + x.tokens, 0) };
}

function pick(task: "chat" | "deep", est: number, skip: Set<string>): { e?: Endpoint; waitMs: number } {
  const now = Date.now();
  const list = endpoints()
    .filter((e) => !skip.has(e.id) && e.disabledUntil < now && est <= e.tpm && (!e.maxOut || task === "chat"))
    .sort((a, b) => (task === "chat" ? a.chatRank - b.chatRank : a.deepRank - b.deepRank));
  let waitMs = 60_000;
  for (const e of list) {
    if (e.cooldownUntil > now) {
      waitMs = Math.min(waitMs, e.cooldownUntil - now);
      continue;
    }
    const u = usage(e, now);
    if (u.reqs < e.rpm && u.tokens + est <= e.tpm) return { e, waitMs: 0 };
    const oldest = e.log[0]?.t ?? now;
    waitMs = Math.min(waitMs, Math.max(500, 60_000 - (now - oldest)));
  }
  if (!list.length) waitMs = -1;
  return { waitMs };
}

function extractJSON(text: string): unknown {
  let t = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  return JSON.parse(t);
}

function retryAfterMs(err: unknown): number {
  const h = (err as { headers?: unknown })?.headers as
    | { get?: (k: string) => string | null; [k: string]: unknown }
    | undefined;
  let v: unknown = null;
  if (h) v = typeof h.get === "function" ? h.get("retry-after") : h["retry-after"];
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(n * 1000 + 250, 65_000) : 15_000;
}

export type LLMOpts<T> = {
  task: "chat" | "deep";
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens: number;
  temperature?: number;
  label?: string;
  deadlineMs?: number;
};

export async function llmJSON<T>(o: LLMOpts<T>): Promise<T> {
  const deadline = Date.now() + (o.deadlineMs ?? 270_000);
  const est = Math.ceil((o.system.length + o.user.length) / 3.4) + Math.ceil(o.maxTokens * 0.6);
  const skip = new Set<string>();
  let repair = "";
  let lastErr = "";
  let attempts = 0;

  while (Date.now() < deadline && attempts < 14) {
    const { e, waitMs } = pick(o.task, est, skip);
    if (!e) {
      if (waitMs < 0) {
        // every endpoint was skipped for this request; reset skips once and wait
        if (skip.size) {
          skip.clear();
          await sleep(3000);
          continue;
        }
        throw new Error(`No AI endpoint can take this request. ${lastErr}`);
      }
      await sleep(Math.min(waitMs, Math.max(0, deadline - Date.now())));
      continue;
    }
    attempts++;
    const entry = { t: Date.now(), tokens: est };
    e.log.push(entry);
    const started = Date.now();
    try {
      const body: Record<string, unknown> = {
        model: e.model,
        messages: [
          { role: "system", content: o.system },
          { role: "user", content: o.user + repair },
        ],
        max_completion_tokens: e.maxOut ? Math.min(e.maxOut, o.maxTokens) : o.maxTokens,
        temperature: o.temperature ?? 0.7,
      };
      if (!e.noJsonMode) body.response_format = { type: "json_object" };
      if (e.reasoning) body.reasoning_effort = o.task === "chat" ? "low" : "medium";
      const res = (await e.client.chat.completions.create(
        body as unknown as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
      )) as OpenAI.Chat.ChatCompletion;
      if (res.usage?.total_tokens) entry.tokens = res.usage.total_tokens;
      const text = res.choices?.[0]?.message?.content ?? "";
      let parsed: unknown;
      try {
        parsed = extractJSON(text);
      } catch {
        lastErr = `${e.id}: invalid JSON`;
        repair = "\n\nIMPORTANT: your previous reply was not valid JSON. Reply with ONE valid JSON object only.";
        continue;
      }
      const v = o.schema.safeParse(parsed);
      if (!v.success) {
        lastErr = `${e.id}: schema ${v.error.issues.slice(0, 3).map((i) => i.path.join(".") + " " + i.message).join("; ")}`;
        repair = `\n\nIMPORTANT: your previous JSON failed validation (${lastErr}). Follow the exact JSON shape requested.`;
        continue;
      }
      if (process.env.LLM_LOG !== "0")
        console.log(`[llm] ${o.label ?? o.task} via ${e.id} ${Date.now() - started}ms tok=${entry.tokens}`);
      return v.data;
    } catch (err) {
      const status = (err as { status?: number })?.status ?? 0;
      const msg = String((err as Error)?.message ?? err).slice(0, 200);
      lastErr = `${e.id} ${status} ${msg}`;
      if (status === 429 && /too large/i.test(msg)) {
        skip.add(e.id);
      } else if (status === 429) {
        e.cooldownUntil = Date.now() + retryAfterMs(err);
        if (/per ?day|TPD|RPD|daily/i.test(msg)) e.disabledUntil = Date.now() + 30 * 60_000;
      } else if (status === 413) {
        skip.add(e.id);
      } else if (status === 400 && /response_format|json/i.test(msg) && !e.noJsonMode) {
        e.noJsonMode = true;
      } else if (status === 400) {
        skip.add(e.id);
      } else if (status === 401 || status === 403) {
        e.disabledUntil = Date.now() + 24 * 3600_000;
      } else if (status === 404) {
        e.disabledUntil = Date.now() + 3600_000;
      } else {
        e.cooldownUntil = Date.now() + 4000;
      }
      console.warn(`[llm] ${o.label ?? o.task} failed on ${lastErr}`);
    }
  }
  throw new Error(`AI call failed (${o.label ?? o.task}): ${lastErr || "timed out waiting for free-tier capacity"}`);
}

// Small helpers for lenient schemas (free models are sometimes sloppy with types).
export const num = (min: number, max: number) =>
  z.preprocess((v) => {
    const n = typeof v === "string" ? parseFloat(v) : (v as number);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
  }, z.number());

export const strArr = z.preprocess(
  (v) => (Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))) : typeof v === "string" ? [v] : []),
  z.array(z.string())
);

export const str = z.preprocess((v) => (v == null ? "" : typeof v === "string" ? v : JSON.stringify(v)), z.string());
