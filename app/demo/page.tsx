import { getPool } from "@/lib/store";
import { PoolView } from "@/components/PoolView";

export const dynamic = "force-dynamic";

export default async function Demo() {
  const ds = await getPool("demo");
  return (
    <div className="space-y-8">
      <div className="card border-gold/40 p-6">
        <div className="label">Demo · finished example, already run</div>
        <h1 className="h-display mt-1 text-4xl font-semibold">{ds.people.length} real people. {ds.dates.length} agent dates. Every ranking.</h1>
        <p className="mt-2 max-w-3xl text-cream/80">
          Each person below was added from their official LinkedIn + public Instagram, scraped with Apify. Their agent read them, swiped on everyone else, went
          on dates with the best candidates, and debriefed. Open any profile → their dates → their ranking. Nothing to type.
        </p>
      </div>
      <PoolView ds={ds} q="?pool=demo" />
    </div>
  );
}
