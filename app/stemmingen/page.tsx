import { Vote } from "lucide-react";
import { ApiStatusPill } from "@/components/api-status-pill";
import { VoteCard } from "@/components/vote-card";
import { getVotesOverview } from "@/lib/tk";

export default async function StemmingenPage() {
  const votes = await getVotesOverview();

  return (
    <main className="page-shell">
      <section className="section-heading dashboard-heading">
        <div>
          <p className="eyebrow">Stemmingen</p>
          <h1>Recente stemuitslagen per fractie.</h1>
        </div>
        <div className="quiet-panel source-panel">
          <Vote size={22} aria-hidden="true" />
          <div>
            <strong>Bronstatus</strong>
            <ApiStatusPill apiOk={votes.apiOk} />
          </div>
        </div>
      </section>

      <section className="result-list list-page">
        {votes.items.map((vote) => (
          <VoteCard vote={vote} key={vote.id} />
        ))}
      </section>
    </main>
  );
}
