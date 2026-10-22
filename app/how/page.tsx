export default function How() {
  const flow = [
    ["LinkedIn URL + public Instagram URL", "The only inputs. Validated, de-duplicated."],
    ["Apify scrapers (in parallel)", "harvestapi/linkedin-profile-scraper → headline, about, experience, education, skills, languages, volunteering. apify/instagram-profile-scraper → bio, follower counts, 12 latest posts with captions, hashtags, locations and Instagram's own image descriptions (alt text). Private accounts are rejected."],
    ["Normalizer", "Both raw datasets become one clean SourceData object — the agent's entire world. Nothing else is ever given to it."],
    ["Analyst agent (reads the person)", "One LLM pass over both sources produces: summary, needs (in a partner), hobbies, interests, values, lifestyle, Big-Five personality, communication style, green flags, friction, date ideas — every trait carries evidence (source + the exact role/post it came from) and a confidence. It also writes a reading log and a dating brief: voice, what to look for, 2–3 must-check questions, dealbreakers."],
    ["Swipe round", "Every agent rates every other person's card 0–100 for its own person, with a reason. Mutual score = average of both directions. Newcomers are rated by all existing agents in one batched call."],
    ["Pairing", "Greedy matching on mutual swipe so everyone gets ≥3 dates with their most promising candidates (newcomers get their top 3)."],
    ["The date (two real agents)", "The keener agent opens and picks a venue from shared interests. Then 6 alternating turns — every turn is a separate model call made by the agent whose turn it is, with its own private brief. Each turn returns: what it says, a private thought for its human, an interest score 0–10 and which must-check questions got answered. Agents must stay truthful to their person's sources."],
    ["Debriefs", "After the date each agent separately scores chemistry, values, lifestyle, interests, goals, gives an overall 0–100 and a verdict (second date / friends / pass) with a note to its human."],
    ["Ranking", "For each person: dated pairs ranked by the geometric mean of both agents' verdicts (only high if mutual), blended with the swipe score; +3 if both want a second date. Everyone not dated yet is ranked from the mutual swipe. Computed live, so it updates when new people join."],
  ];
  return (
    <div className="space-y-8">
      <div>
        <div className="label">How it works</div>
        <h1 className="h-display text-4xl font-semibold">Two sources in. An agent that dates for you out.</h1>
        <p className="mt-2 max-w-3xl text-cream/80">
          Wingmate represents every person with an AI agent. The agent only knows what their LinkedIn and public Instagram say. From that it builds a
          profile, then goes out and dates the other agents on its person&apos;s behalf.
        </p>
      </div>
      <ol className="relative space-y-3 border-l-2 border-rose/40 pl-6">
        {flow.map(([t, d], i) => (
          <li key={i} className="card relative p-4">
            <span className="absolute -left-[37px] top-4 grid h-6 w-6 place-items-center rounded-full bg-rose text-xs font-bold text-ink">{i + 1}</span>
            <div className="font-semibold">{t}</div>
            <p className="mt-1 text-sm text-cream/80">{d}</p>
          </li>
        ))}
      </ol>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <div className="label mb-2">Tech stack</div>
          <ul className="space-y-1.5 text-sm text-cream/85">
            <li>• Next.js 15 (App Router) + TypeScript + Tailwind, on Vercel</li>
            <li>• Apify via the official apify-client SDK: harvestapi/linkedin-profile-scraper (no cookies) + apify/instagram-profile-scraper (+ apify/instagram-scraper as a posts fallback)</li>
            <li>• LLMs: open-weight gpt-oss-120b / qwen on Groq + Cerebras through an OpenAI-compatible router with per-model rate pacing and automatic failover</li>
            <li>• Zod-validated JSON for every agent output (with a repair retry)</li>
            <li>• Upstash Redis for live additions; the 25+ person demo is a frozen snapshot in the repo</li>
          </ul>
        </div>
        <div className="card p-5">
          <div className="label mb-2">Design choices</div>
          <ul className="space-y-1.5 text-sm text-cream/85">
            <li>• Agents never see each other&apos;s private brief — only the other person&apos;s public card, like a real app.</li>
            <li>• Evidence on every trait, so the analysis is checkable against the two sources.</li>
            <li>• Hard rules against outside knowledge and sensitive inferences (religion, health, orientation, ethnicity, politics, relationship status).</li>
            <li>• The live flow is driven step-by-step from the browser (scrape → read → swipe → one date move per request) so nothing hits serverless timeouts and you watch it happen.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
