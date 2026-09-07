import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NotFoundDetail } from "@/components/detail-panel";
import { VoteCard } from "@/components/vote-card";
import { besluitDbToVoteSummary, getBesluitenMetStemmingenDb } from "@/lib/db";

type StemmingDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function StemmingDetailPage({ params }: StemmingDetailPageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const entries = await getBesluitenMetStemmingenDb({ besluitId: decodedId });
  const summary = entries[0] ? besluitDbToVoteSummary(entries[0]) : null;

  if (!summary) {
    return <NotFoundDetail title="Stemming niet gevonden" backHref="/stemmingen" backLabel="Terug naar stemmingen" />;
  }

  return (
    <main className="page-shell detail-page">
      <Link className="text-link back-link" href="/stemmingen">
        <ArrowLeft size={16} aria-hidden="true" />
        Terug naar stemmingen
      </Link>
      <section className="detail-panel">
        <div>
          <p className="eyebrow">Stemming</p>
          <h1>{summary.title}</h1>
          <p>{summary.result}</p>
        </div>
      </section>
      <VoteCard vote={summary} />
    </main>
  );
}
