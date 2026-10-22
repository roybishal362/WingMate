# Wingmate — an agentic dating site

**Every person is represented by an AI agent. The agent reads its person from exactly two sources — their LinkedIn and their public Instagram — builds a profile (needs, hobbies, interests, values, personality…), then goes on real multi‑turn dates with the other agents on its person's behalf. Every person ends up with a ranking of who fits them best.**

- `/` — live site: paste a LinkedIn + public Instagram URL and watch the whole pipeline run (scrape → read → swipe → 3 live dates → ranking).
- `/demo` — the finished example: 28 real people, already scraped, analyzed, dated and ranked.
- `/p/:id` profile page · `/p/:id/ranking` ranking · `/dates/:id` date replay with each agent's private thoughts and debrief · `/rankings` · `/how`.

## How it works

```
LinkedIn URL + public Instagram URL
        │
        ▼
Apify (apify-client, runs in parallel)
  • harvestapi/linkedin-profile-scraper  → headline, about, experience, education, skills, languages, volunteering…
  • apify/instagram-profile-scraper      → bio, counts, 12 latest posts (captions, hashtags, locations, alt-text image descriptions)
  • apify/instagram-scraper (posts)      → fallback when Instagram rate-limits the timeline
        │  normalize → one SourceData object (the agent's entire world)
        ▼
Analyst agent ── reads both sources ──► Profile
  needs · hobbies · interests · values · lifestyle · Big‑Five · communication style · green flags · friction
  every trait = {label, detail, evidence:[{source, ref}], confidence}  +  reading log  +  dating brief
  (voice, looking for, must‑check questions, dealbreakers)
        │
        ▼
Swipe round: every agent scores every other card 0–100 with a reason (mutual = average of both directions)
        │
        ▼
Pairing: greedy on mutual swipe → everyone gets ≥3 dates
        │
        ▼
The date: venue picked from shared interests, 6 alternating turns — each turn is a separate model call
made by the agent whose turn it is → {message, private thought, interest 0–10, must‑checks answered}
        │
        ▼
Debriefs: each agent independently scores chemistry/values/lifestyle/interests/goals, overall 0–100,
verdict (second date / friends / pass) and a note to its human
        │
        ▼
Ranking: dated pairs = √(overall_A × overall_B) blended 75/25 with mutual swipe (+3 if both want a second date);
not-yet-dated = mutual swipe × 0.85. Computed on read, so it updates when new people join.
```

### Agent rules (in the prompts)
- Only the two sources. No outside knowledge, even about famous people. Every trait cites its evidence.
- No sensitive inferences (religion, health, orientation, ethnicity, politics, relationship status).
- On a date the agent speaks as its person's stand‑in, must not invent facts ("I'd have to ask her…"), sees only the other person's *public card* — never their private brief.

## Stack
- **Next.js 15** (App Router, TypeScript, Tailwind) on **Vercel**
- **Apify** via the official `apify-client` SDK (actors above)
- **LLMs (free tiers)**: Google Gemini (2.5 Flash / Flash‑Lite / 2.0 Flash) + Groq (`gpt-oss-120b`, `gpt-oss-20b`, `qwen3.8-27b`) behind an OpenAI‑compatible router (`lib/llm.ts`) with per‑model RPM/TPM pacing, `retry-after` handling and automatic failover
- **Zod**-validated JSON for every agent output, with a repair retry
- **Storage**: demo = frozen snapshot `data/demo.json` (+ cached media in `public/media`); live additions = Upstash Redis (falls back to local files in dev)

## Code map
| Path | What |
|---|---|
| `lib/apify.ts`, `lib/normalize.ts` | Apify runs + raw → `SourceData` |
| `lib/agents/analyst.ts` | the agent reads its person |
| `lib/agents/screener.ts` | swipe round (forward + reverse for newcomers) |
| `lib/agents/dater.ts` | turn-by-turn dates + debriefs |
| `lib/pairing.ts`, `lib/rank.ts` | who dates whom, rankings |
| `lib/llm.ts` | free-tier model router |
| `app/api/**` | live pipeline: `people` → `scrape` → `analyze` → `screen` → `dates/:id/turn` |
| `scripts/scrape-raw.ts`, `scripts/ig-fix.ts`, `scripts/seed.ts` | batch build of the demo (resumable) |

## Run locally
```bash
npm install
cp .env.example .env      # APIFY_TOKEN, GEMINI_API_KEY and/or GROQ_API_KEY
npm run dev
# rebuild the demo:
npx tsx scripts/scrape-raw.ts && npx tsx scripts/seed.ts
```

Public data only, for an assessment demo. AI inferences can be wrong.
