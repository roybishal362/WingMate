// Run one date between two seeded people and print it.  npx tsx scripts/test-date.ts <idA> <idB>
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import { FileStore } from "../lib/store";
import { newDate } from "../lib/pairing";
import { runFullDate } from "../lib/agents/dater";

async function main() {
  const s = new FileStore("data/seed");
  const [a, b] = await Promise.all([s.getPerson(process.argv[2]), s.getPerson(process.argv[3])]);
  if (!a?.analysis || !b?.analysis) throw new Error("both need analysis");
  const people = { [a.id]: a, [b.id]: b };
  const d = await runFullDate(newDate(a.id, b.id, "demo"), people, async (x) => {
    const t = x.turns[x.turns.length - 1];
    if (x.status === "talking" || (x.status === "debrief" && !x.debriefs.length)) console.log(`\n${people[t.speaker].name}: ${t.message}\n   💭 ${t.thought} [${t.interest}/10]`);
  });
  console.log("\nVENUE:", d.venue, "—", d.venueWhy);
  for (const x of d.debriefs) console.log(`\nDEBRIEF ${people[x.personId].name}: ${x.overall} ${x.verdict} — ${x.noteToHuman}`);
  await s.saveDate(d);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
