import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import OpenAI from "openai";
import { env } from "../lib/env";

const models = process.argv.slice(2);
const c = new OpenAI({ apiKey: env.geminiKey(), baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", maxRetries: 0, timeout: 60_000 });
Promise.all(
  models.map(async (m) => {
    const t = Date.now();
    try {
      const r = await c.chat.completions.create({
        model: m,
        messages: [{ role: "user", content: 'Reply with JSON {"ok": true, "word": "<one romantic word>"}' }],
        response_format: { type: "json_object" },
        max_completion_tokens: 300,
      });
      console.log(`OK   ${m} ${Date.now() - t}ms ${r.choices[0].message.content?.replace(/\s+/g, " ").slice(0, 60)}`);
    } catch (e) {
      console.log(`FAIL ${m} ${(e as { status?: number }).status} ${String((e as Error).message).slice(0, 140)}`);
    }
  })
);
