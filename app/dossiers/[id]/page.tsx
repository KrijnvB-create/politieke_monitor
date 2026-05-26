import { DetailPanel, NotFoundDetail } from "@/components/detail-panel";
import { getDossierItemById } from "@/lib/tk";

type DossierDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DossierDetailPage({ params }: DossierDetailPageProps) {
  const { id } = await params;
  const item = await getDossierItemById(decodeURIComponent(id));

  if (!item) {
    return <NotFoundDetail title="Dossier of zaak niet gevonden" backHref="/dossiers" backLabel="Terug naar dossiers" />;
  }

  return <DetailPanel item={item} backHref="/dossiers" backLabel="Terug naar dossiers" />;
}
