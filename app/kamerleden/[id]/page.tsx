import { DetailPanel, NotFoundDetail } from "@/components/detail-panel";
import { getMemberItemById, personResourceUrl } from "@/lib/tk";

type KamerlidDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function KamerlidDetailPage({ params }: KamerlidDetailPageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const item = await getMemberItemById(decodedId);

  if (!item) {
    return <NotFoundDetail title="Kamerlid niet gevonden" backHref="/kamerleden" backLabel="Terug naar Kamerleden" />;
  }

  return (
    <DetailPanel
      item={item}
      backHref="/kamerleden"
      backLabel="Terug naar Kamerleden"
      externalHref={personResourceUrl(decodedId)}
      externalLabel="Open foto"
    />
  );
}
