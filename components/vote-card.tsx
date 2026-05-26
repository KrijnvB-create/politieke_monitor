import Link from "next/link";
import type { VoteSummary } from "@/lib/tk";
import { factionColor } from "@/lib/factions";
import { SaveButton } from "@/components/save-button";

export function VoteCard({ vote }: { vote: VoteSummary }) {
  const voorWidth = `${Math.round((vote.voor / vote.total) * 100)}%`;
  const tegenWidth = `${Math.round((vote.tegen / vote.total) * 100)}%`;
  const onthoudenWidth = `${Math.round((vote.onthouden / vote.total) * 100)}%`;

  return (
    <article className="vote-card">
      <div className="vote-card-head">
        <div>
          <p className="eyebrow">{vote.result}</p>
          <h3>
            <Link className="result-title-link" href={`/stemmingen/${encodeURIComponent(vote.id)}`}>
              {vote.title}
            </Link>
          </h3>
          <p>{vote.date}</p>
        </div>
        <div className="vote-totals" aria-label="Stemverhouding">
          <strong>{vote.voor}</strong>
          <span>voor</span>
          <strong>{vote.tegen}</strong>
          <span>tegen</span>
        </div>
      </div>
      <div className="vote-bar" aria-hidden="true">
        <span className="vote-bar-for" style={{ width: voorWidth }} />
        <span className="vote-bar-against" style={{ width: tegenWidth }} />
        <span className="vote-bar-abstain" style={{ width: onthoudenWidth }} />
      </div>
      <div className="vote-lines">
        {vote.lines.slice(0, 18).map((line) => (
          <span className="vote-chip" key={`${vote.id}-${line.faction}`}>
            <i style={{ background: factionColor(line.faction) }} />
            {line.faction}: {line.vote}
          </span>
        ))}
      </div>
      <div className="result-actions">
        <Link className="secondary-button inline-flex" href={`/stemmingen/${encodeURIComponent(vote.id)}`}>
          Open stemming
        </Link>
        <SaveButton kind="stemming" refId={vote.id} label={vote.title} meta={vote.meta} />
      </div>
    </article>
  );
}
