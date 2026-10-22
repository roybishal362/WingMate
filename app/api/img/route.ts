// Image proxy for Instagram / LinkedIn CDN images (they block hotlinking and expire).
const ALLOWED = /(cdninstagram\.com|fbcdn\.net|licdn\.com)$/i;

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u");
  if (!u) return new Response("missing u", { status: 400 });
  let host = "";
  try {
    host = new URL(u).hostname;
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (!ALLOWED.test(host)) return new Response("host not allowed", { status: 403 });
  const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!r.ok) return new Response("upstream error", { status: 502 });
  return new Response(r.body, {
    headers: { "content-type": r.headers.get("content-type") ?? "image/jpeg", "cache-control": "public, max-age=86400, s-maxage=604800" },
  });
}
