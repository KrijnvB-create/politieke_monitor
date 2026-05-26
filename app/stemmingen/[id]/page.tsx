import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DetailPanel, NotFoundDetail } from "@/components/detail-panel";
import { VoteCard } from "@/components/vote-card";
import { getVoteDetailById } from "@/lib/tk";

type StemmingDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function StemmingDetailPage({ params }: StemmingDetailPageProps) {
  const { id } = await params;
  const vote = await getVoteDetailById(decodeURIComponent(id));

  if (vote.summary) {
    return (
      <main className="page-shell detail-page">
        <Link className="text-link back-link" href="/stemmingen">
          <ArrowLeft size={16} aria-hidden="true" />
          Terug naar stemmingen
        </Link>
        <section className="detail-panel">
          <div>
            <p className="eyebrow">Stemming</p>
            <h1>{vote.summary.title}</h1>
            <p>{vote.summary.result}</p>
          </div>
        </section>
        <VoteCard vote={vote.summary} />
      </main>
    );
  }

  if (vote.item) {
    return <DetailPanel item={vote.item} backHref="/stemmingen" backLabel="Terug naar stemmingen" />;
  }

  return <NotFoundDetail title="Stemming niet gevonden" backHref="/stemmingen" backLabel="Terug naar stemmingen" />;
}
