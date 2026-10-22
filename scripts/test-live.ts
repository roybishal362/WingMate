// Drive the live API like the browser does.  npx tsx scripts/test-live.ts <base> <linkedin> <instagram>
const [base, linkedin, instagram] = process.argv.slice(2);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function post(path: string, body?: unknown) {
  const r = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (!r.ok) throw new Error(`${path} ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return j;
}
async function main() {
  const t = Date.now();
  const s = () => `${((Date.now() - t) / 1000).toFixed(0)}s`;
  const c = await post("/api/people", { linkedin, instagram });
  console.log(s(), "created", c);
  const id = c.id;
  let p;
  for (;;) {
    const r = await post(`/api/people/${id}/scrape`);
    p = r.person;
    console.log(s(), "scrape", p.status, r.li, r.ig, p.error ?? "");
    if (p.status !== "scraping") break;
    await sleep(4000);
  }
  if (p.status === "error") return;
  console.log(s(), "posts:", p.source.instagram.posts.length, "roles:", p.source.linkedin.experience.length);
  p = (await post(`/api/people/${id}/analyze`)).person;
  console.log(s(), "analyzed:", p.analysis.tagline);
  const sc = await post(`/api/people/${id}/screen`);
  console.log(s(), "partners:", sc.partners.map((x: { name: string; score: number }) => `${x.name}:${x.score}`).join(", "));
  await Promise.all(
    sc.person.dateIds.map(async (did: string) => {
      let d;
      do {
        d = (await post(`/api/dates/${did}/turn`)).date;
      } while (d.status !== "done");
      console.log(s(), "date done", did, d.venue, d.debriefs.map((x: { overall: number; verdict: string }) => `${x.overall}/${x.verdict}`).join(" "));
    })
  );
  const g = await (await fetch(`${base}/p/${id}/ranking`)).text();
  console.log(s(), "ranking page bytes", g.length);
}
main().catch((e) => {
  console.error("FAILED", e.message);
  process.exit(1);
});
