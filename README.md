<div align="center">

# ♥ Wingmate

### Your agent goes on the dates. You meet the right one.

**An agentic dating site: every person is represented by an AI agent that reads their LinkedIn and public Instagram, builds an evidence-backed profile, goes on real multi-turn dates with the other agents on their behalf, and ranks who fits them best.**

[**Live site**](https://wing-mate-seven.vercel.app) · [**Demo — 28 real people, already run**](https://wing-mate-seven.vercel.app/demo) · [**How it works**](https://wing-mate-seven.vercel.app/how)

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Apify](https://img.shields.io/badge/Scraping-Apify-97d700?logo=apify&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)
![Upstash](https://img.shields.io/badge/Storage-Upstash%20Redis-00e9a3?logo=upstash&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

</div>

---

## Table of contents
1. [What it does](#what-it-does)
2. [Screenshots](#screenshots)
3. [The agent harness](#the-agent-harness)
4. [Architecture](#architecture)
5. [Scraping stack (LinkedIn + Instagram via Apify)](#scraping-stack)
6. [Ranking math](#ranking-math)
7. [Tech stack](#tech-stack)
8. [Project structure](#project-structure)
9. [API reference](#api-reference)
10. [Run locally](#run-locally)
11. [Deploy](#deploy)
12. [Rebuilding the demo](#rebuilding-the-demo)
13. [Design decisions & trade-offs](#design-decisions--trade-offs)
14. [Privacy & ethics](#privacy--ethics)

---

## What it does

| Step | What happens | Where to see it |
|---|---|---|
| **1. Paste two links** | A LinkedIn URL and a **public** Instagram URL. Nothing else. | `/` |
| **2. Apify scrapes both** | Two Apify actors run in parallel; private Instagram accounts are rejected. | `/add/:id` (live) |
| **3. The agent reads its person** | Needs, hobbies, interests, values, lifestyle, Big-Five personality, communication style, green flags, friction — **every trait cites the post or role it came from**. | `/p/:id` profile page |
| **4. Agents swipe** | Every agent rates every other person 0–100 for its own human, with a reason. | `/add/:id` |
| **5. Agents date** | Two agents talk turn by turn — each turn is a separate model call by the agent whose turn it is — with private thoughts, an interest meter and must-check questions. | `/dates/:id` replay |
| **6. Debrief & rank** | Each agent independently scores the date and says *second date / friends / pass*. Mutual verdicts decide who fits best. | `/p/:id/ranking`, `/rankings` |

The **demo** (`/demo`) is the finished example: **28 real people** (public creators, founders and authors), each added from their official LinkedIn + public Instagram, with all their dates and rankings already computed — nothing to type.

## Screenshots

| Profile page (analysis with evidence) | Live pipeline with 3 dates side by side |
|---|---|
| ![Profile](docs/screenshots/profile.png) | ![Live](docs/screenshots/live.png) |

| A date replay (private thoughts + debriefs) | A ranking |
|---|---|
| ![Date](docs/screenshots/date.png) | ![Ranking](docs/screenshots/ranking.png) |

| The finished 28-person demo |
|---|
| ![Demo](docs/screenshots/demo.png) |

## The agent harness

Every person gets **one agent**. The agent's entire world is exactly two sources: the person's LinkedIn and the person's public Instagram. It never sees anything else.

### 1 · The Analyst — reading a person (`lib/agents/analyst.ts`)
The scraped data is rendered into a compact, referenceable dossier (`[LI exp 2] Founder @ X`, `[IG post 7] … caption … image shows: …`) and the agent writes a structured profile:

- **Needs** — what this person needs *from a partner* to thrive, with the reasoning.
- **Hobbies, interests, values, lifestyle** — each a `Trait { label, detail, evidence[], confidence }`.
- **Personality** — Big-Five scores with one-line justifications.
- **Communication style, career & ambition, green flags, friction, conversation hooks, first-date ideas.**
- **Reading log** — the item-by-item notes the agent took while reading (shown on the profile page).
- **Dating brief** — the agent's own instructions for dating on this person's behalf: voice, what to look for, **2–3 must-check questions**, dealbreakers, highlights to share.

Hard rules in the prompt: only the two sources (no outside knowledge, even about famous people), cite evidence for every trait, cross-check LinkedIn vs Instagram, and never infer religion, health, orientation, ethnicity, politics or relationship status.

### 2 · The swipe round (`lib/agents/screener.ts`)
Each agent sees every other person's **public card** (tagline, work, interests, hobbies, values, needs) and scores them 0–100 *for its own human*, with a specific reason. Newcomers on the live site are scored by all existing agents in one batched "room" call, so both directions exist. Mutual score = average of both directions.

### 3 · Pairing (`lib/pairing.ts`)
Greedy matching on mutual swipe score so every person gets **at least 3 dates** with their most promising candidates (max 4). The keener agent opens the date. Newcomers get their top 3.

### 4 · The date (`lib/agents/dater.ts`)
A real two-agent conversation, not a single generated script:

- **Opening** — the initiating agent proposes a specific venue that fits *both* people's interests and opens with a line about something in the other person's profile.
- **6 alternating turns** — each turn is a **separate LLM call made by the agent whose turn it is**, with its own private brief (its person's full profile, must-check questions, dealbreakers) and only the other person's *public card*. The conversation is phased: opening → reply → conversation → go deeper (must-checks) → wrap-up with an honest hint about a second date.
- Every turn returns `{ message, thought, interest 0–10, checked[] }` — what it says out loud, a **private note to its human**, how into the match it is right now, and which must-check questions got answered.
- Agents speak as their person's stand-in, **may not invent facts** ("I'd have to ask her, but from what I know…") and never bring up current partners or children.

### 5 · Debriefs
After the date, **each agent separately** reports back to its human: chemistry / values / lifestyle / interests / goals (0–10), overall 0–100, verdict (`second_date | friends | pass`), best moment, biggest concern, and a 2-sentence recommendation. Agents are told their job is to *protect their human's time* — honest, not polite (and they do say "pass").

## Architecture

```mermaid
flowchart TD
    A[LinkedIn URL + public Instagram URL] --> B{Validate & de-duplicate}
    B --> C1[Apify · harvestapi/linkedin-profile-scraper]
    B --> C2[Apify · apify/instagram-profile-scraper]
    C2 -. timeline rate-limited .-> C3[Apify · apify/instagram-scraper posts]
    C1 --> D[Normalizer → SourceData]
    C2 --> D
    C3 --> D
    D --> E[Analyst agent → evidence-backed Profile + Dating brief]
    E --> F[Swipe round: forward + reverse]
    F --> G[Pairing: top mutual candidates]
    G --> H[Date: 6 turns, one model call per agent turn]
    H --> I[Two independent debriefs]
    I --> J[Ranking: computed on read]
    E --> P[(Profile page)]
    H --> Q[(Date replay)]
    J --> R[(Ranking page)]
```

**Live flow is client-driven.** The browser walks the pipeline one short request at a time (`scrape` → `analyze` → `screen` → one `turn` per request), so no request comes near serverless time limits, every step is resumable after a refresh, and you *watch* the agents date in real time.

```mermaid
sequenceDiagram
    participant UI as Browser (/add/:id)
    participant API as Next.js API
    participant AP as Apify
    participant LLM as LLM router
    participant DB as Upstash Redis
    UI->>API: POST /api/people {linkedin, instagram}
    API->>AP: start LinkedIn + Instagram runs
    API->>DB: save person (scraping)
    loop every 4s
        UI->>API: POST /api/people/:id/scrape
        API->>AP: run status → dataset items
    end
    UI->>API: POST /api/people/:id/analyze
    API->>LLM: Analyst agent
    UI->>API: POST /api/people/:id/screen
    API->>LLM: forward + reverse swipes → 3 dates
    par 3 dates side by side
        loop until done
            UI->>API: POST /api/dates/:id/turn
            API->>LLM: one agent speaks / debriefs
            API->>DB: save date
        end
    end
    UI->>UI: ranking ready
```

## Scraping stack

| Source | Apify actor | What we use |
|---|---|---|
| LinkedIn | [`harvestapi/linkedin-profile-scraper`](https://apify.com/harvestapi/linkedin-profile-scraper) (no cookies, no login) | name, headline, about, location, experience (title, company, duration, description), education, skills, languages, certifications, volunteering, honors, projects, publications, photo |
| Instagram | [`apify/instagram-profile-scraper`](https://apify.com/apify/instagram-profile-scraper) | bio, full name, followers/following/posts, verified, category, link in bio, **private flag**, profile picture, **12 latest posts**: caption, hashtags, location, likes, comments, timestamp, Instagram's own **alt-text image description** |
| Instagram (fallback) | [`apify/instagram-scraper`](https://apify.com/apify/instagram-scraper) `resultsType: "posts"` | used automatically when Instagram refuses the profile scraper's timeline request |

- Called with the official [`apify-client`](https://www.npmjs.com/package/apify-client) SDK from Next.js route handlers (`lib/apify.ts`). Live runs are started asynchronously and polled; the demo uses batched runs (`scripts/scrape-raw.ts`, max 10 LinkedIn profiles per run on the free plan).
- Raw dataset items are normalized into one `SourceData` object (`lib/normalize.ts`) — the agent's entire world.
- Profile pictures are stored as small data-URLs (live) or cached files in `public/media` (demo), because Instagram CDN links expire. Post images on live profiles go through an allow-listed proxy (`/api/img`).
- Every demo pair was **identity-checked**: LinkedIn name/headline vs Instagram name/bio; mismatched profiles (same name, different person) were dropped.

## Ranking math

For person **P** and candidate **Q**:

- **Dated:** `score = 0.75 · √(overall_P→Q × overall_Q→P) + 0.25 · mutualSwipe + (3 if both say "second date")`
  The geometric mean means a match only scores high when **both** agents liked it.
- **Not yet dated:** `score = 0.85 · mutualSwipe` (labelled *screened only*).

Rankings are computed on read (`lib/rank.ts`), so they update as soon as a new person's dates finish.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js 15** App Router, React 19, TypeScript (strict), Tailwind CSS | server components for data pages, route handlers for the pipeline |
| Scraping | **Apify** (`apify-client`) | reliable, no-cookie LinkedIn + Instagram actors |
| LLMs | Google **Gemini** 3.x Flash / Flash-Lite + **Groq** (`gpt-oss-120b`, `gpt-oss-20b`, `qwen3.8-27b`) — all free tiers | an OpenAI-compatible **router** (`lib/llm.ts`) paces each model under its RPM/TPM, honours `retry-after`/`retryDelay`, fails over on 429/503 and caps output tokens per model |
| Validation | **Zod** schemas on every agent output, with a repair retry | free models are occasionally sloppy with JSON |
| Storage | **Upstash Redis** for live additions; demo = frozen `data/demo.json` | the demo can never break; live data persists across serverless instances |
| Hosting | **Vercel** | zero-config Next.js, `maxDuration` per route |

## Project structure

```
app/
  page.tsx                  Live home: add form, top couples, everyone
  demo/                     Finished 28-person example (read-only snapshot)
  add/[id]/                 Live pipeline view (client-driven)
  p/[id]/                   Profile page — the analysis with evidence
  p/[id]/ranking/           Ranking for one person
  dates/ · dates/[id]/      All dates · one date replay
  rankings/ · how/          Everyone's top 3 + top couples · explanation
  api/
    people/                 POST: validate links, start Apify runs
    people/[id]/            GET: person + dates + partners
    people/[id]/scrape/     POST: poll Apify, normalize (+ Instagram posts fallback)
    people/[id]/analyze/    POST: Analyst agent
    people/[id]/screen/     POST: swipes (both directions) + create 3 dates
    dates/[id]/turn/        POST: advance a date by one agent move
    img/                    Allow-listed CDN image proxy
    health/                 Keys + storage status
components/                 UI (profile sections, chat bubbles, live runner…)
lib/
  agents/analyst.ts         reads a person → Analysis
  agents/screener.ts        swipe round
  agents/dater.ts           turn-by-turn dates + debriefs
  apify.ts · normalize.ts   scraping + raw → SourceData
  llm.ts                    free-tier model router
  pairing.ts · rank.ts      who dates whom · rankings
  store.ts                  Redis / file stores, demo + live pools
scripts/
  scrape-raw.ts             batched Apify runs for the demo people
  ig-fix.ts                 posts fallback for rate-limited Instagram timelines
  seed.ts                   read → swipe → date → export data/demo.json (resumable)
  test-live.ts              end-to-end test of the live API
data/
  people.csv                the 28 demo people (official LinkedIn + Instagram)
  demo.json                 the finished example
```

## API reference

| Method | Route | Body / result |
|---|---|---|
| `POST` | `/api/people` | `{ linkedin, instagram }` → `{ id }` (or `{ id, existing }` if already in the pool) |
| `GET` | `/api/people/:id` | `{ person, dates, partners }` |
| `POST` | `/api/people/:id/scrape` | polls Apify → `{ person, li, ig }` run statuses |
| `POST` | `/api/people/:id/analyze` | runs the Analyst → `{ person }` |
| `POST` | `/api/people/:id/screen` | swipes both ways, creates 3 dates → `{ person, swipes, partners }` |
| `POST` | `/api/dates/:id/turn` | one agent turn or one debrief → `{ date }` |
| `GET` | `/api/health` | configured keys + storage backend |

## Run locally

```bash
git clone https://github.com/roybishal362/WingMate.git && cd WingMate
npm install
cp .env.example .env      # fill in the keys below
npm run dev               # http://localhost:3000
```

| Variable | Required | Where to get it |
|---|---|---|
| `APIFY_TOKEN` | yes | [console.apify.com → Settings → Integrations](https://console.apify.com/settings/integrations) |
| `GEMINI_API_KEY` | one of these two | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (free, no card) |
| `GROQ_API_KEY` | one of these two | [console.groq.com/keys](https://console.groq.com/keys) (free) |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | production | Vercel → Storage → Upstash for Redis (set automatically). Locally, data is stored in `data/live/` |

## Deploy

1. Import the repo on [vercel.com/new](https://vercel.com/new).
2. Add `APIFY_TOKEN`, `GEMINI_API_KEY`, `GROQ_API_KEY` as environment variables.
3. Project → **Storage** → **Upstash for Redis** → Connect → Redeploy.
4. Check `https://<your-app>/api/health` → `"storage": "redis (persistent)"`.

## Rebuilding the demo

```bash
npm run scrape            # batched Apify runs for data/people.csv → data/cache/raw-*.json
npm run seed              # read → swipe → date → export data/demo.json (resumable)
npm run test:live -- http://localhost:3000 <linkedin-url> <instagram-url>
```

## Design decisions & trade-offs

- **Two sources, nothing else.** The agent gets a normalized dossier and is told not to use outside knowledge — important because many demo people are public figures the model may "know".
- **Evidence on every trait** makes the analysis checkable: hover-free, the source and the exact role/post sit under each trait.
- **One model call per agent turn** (not one call writing a whole conversation) keeps the agents genuinely separate: each only knows its own human's private brief and the other's public card.
- **Mutual verdicts** (geometric mean) stop one over-eager agent from inflating a match.
- **Free-tier first.** The router spreads ~450 calls for the demo across several free models; it paces by RPM/TPM, reads Google's `retryDelay`, and fails over automatically.
- **Frozen demo + persistent live pool.** Graders always see the finished example, and anyone can add people that then date the demo pool.

## Privacy & ethics

Only **public** LinkedIn profiles and **public** Instagram accounts are used; private Instagram accounts are rejected. Demo people are public figures who publish on both platforms. The analysis avoids sensitive inferences, agents never discuss partners or children, and every page carries a disclaimer that AI inferences can be wrong. Built as an assessment demo; not affiliated with anyone shown.

## License

[MIT](LICENSE)
