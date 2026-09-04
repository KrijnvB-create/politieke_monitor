import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NotFoundDetail } from "@/components/detail-panel";
import { RelationChipGroup } from "@/components/RelationChip";
import { getCommissieDb, persoonNaamDb } from "@/lib/db";

type CommissieDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CommissieDetailPage({ params }: CommissieDetailPageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const detail = await getCommissieDb(decodedId);

  if (!detail) {
    return <NotFoundDetail title="Commissie niet gevonden" backHref="/kamerleden" backLabel="Terug naar Kamerleden" />;
  }

  const { commissie, leden } = detail;

  const ledenChips = leden.map((entry) => ({
    variant: "kamerlid" as const,
    label: persoonNaamDb(entry.persoon) || "Onbekend",
    href: `/kamerleden/${entry.persoon.id}`,
    sub: entry.functie ?? undefined,
  }));

  return (
    <main className="page-shell detail-page">
      <Link className="text-link back-link" href="/kamerleden">
        <ArrowLeft size={16} aria-hidden="true" />
        Terug naar Kamerleden
      </Link>

      <section className="detail-panel">
        <div>
          <p className="eyebrow">Commissie</p>
          <h1>{commissie.naam_nl ?? commissie.afkorting ?? "Commissie"}</h1>
          <p>{commissie.soort ?? "Geen extra omschrijving beschikbaar."}</p>
        </div>
      </section>

      <section className="quiet-panel detail-meta">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Leden</p>
            <h2>Commissieleden{ledenChips.length ? ` (${ledenChips.length})` : ""}</h2>
          </div>
        </div>
        {ledenChips.length === 0 ? (
          <p>Geen actuele leden bekend voor deze commissie.</p>
        ) : (
          <RelationChipGroup chips={ledenChips} max={60} />
        )}
      </section>
    </main>
  );
}
