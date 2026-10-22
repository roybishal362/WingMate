// Reads keys under the standard names, with aliases for the local .env file.
function pick(...names: string[]): string {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return "";
}

export const env = {
  apifyToken: () => pick("APIFY_TOKEN", "apify", "APIFY"),
  groqKey: () => pick("GROQ_API_KEY", "groqp_api", "groq_api", "groq"),
  cerebrasKey: () => pick("CEREBRAS_API_KEY", "cerebras", "CEREBRAS"),
  geminiKey: () => pick("GEMINI_API_KEY", "gemini", "GEMINI", "GOOGLE_API_KEY", "gemini_api"),
  redisUrl: () => pick("KV_REST_API_URL", "UPSTASH_REDIS_REST_URL"),
  redisToken: () => pick("KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN"),
  linkedinActor: () => pick("LINKEDIN_ACTOR") || "harvestapi/linkedin-profile-scraper",
  instagramActor: () => pick("INSTAGRAM_ACTOR") || "apify/instagram-profile-scraper",
};
