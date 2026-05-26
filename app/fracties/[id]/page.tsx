import { DetailPanel, NotFoundDetail } from "@/components/detail-panel";
import { factionResourceUrl, getFactionItemById } from "@/lib/tk";

type FractieDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function FractieDetailPage({ params }: FractieDetailPageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const item = await getFactionItemById(decodedId);

  if (!item) {
    return <NotFoundDetail title="Fractie niet gevonden" backHref="/fracties" backLabel="Terug naar fracties" />;
  }

  return (
    <DetailPanel
      item={item}
      backHref="/fracties"
      backLabel="Terug naar fracties"
      externalHref={factionResourceUrl(decodedId)}
      externalLabel="Open bron"
    />
  );
}
