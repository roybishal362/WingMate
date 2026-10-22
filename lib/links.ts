// Parse and validate the two official links.
export function liSlug(input: string): string | null {
  const m = input.trim().match(/linkedin\.com\/in\/([^/?#\s]+)/i);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]).toLowerCase();
  } catch {
    return m[1].toLowerCase();
  }
}

export function igUsername(input: string): string | null {
  const t = input.trim();
  const m = t.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (m) {
    const u = m[1].toLowerCase();
    if (["p", "reel", "reels", "stories", "explore", "accounts"].includes(u)) return null;
    return u;
  }
  const h = t.replace(/^@/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(h) ? h.toLowerCase() : null;
}

export const liUrl = (slug: string) => `https://www.linkedin.com/in/${slug}/`;
export const igUrl = (user: string) => `https://www.instagram.com/${user}/`;
