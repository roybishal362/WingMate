import { getPool } from "@/lib/store";
import { PoolView, Steps } from "@/components/PoolView";
import { AddForm } from "@/components/AddForm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const ds = await getPool("live");
  return (
    <div className="space-y-10">
      <div className="grid items-center gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="label">An agentic dating site</div>
          <h1 className="h-display mt-2 text-5xl font-semibold leading-[1.05] md:text-6xl">
            Your agent goes on the dates. <span className="text-rose">You meet the right one.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-cream/80">
            Every person is represented by an AI agent. It reads their LinkedIn and public Instagram, builds a profile of their needs, hobbies and
            interests, then dates the other agents on their behalf — and ranks who fits them best.
          </p>
          <div className="mt-5 flex gap-2">
            <a href="/demo" className="btn-ghost">
              See the finished 25-person example
            </a>
            <a href="/how" className="btn-ghost">
              How it works
            </a>
          </div>
        </div>
        <AddForm />
      </div>
      <Steps />
      <PoolView ds={ds} />
    </div>
  );
}
