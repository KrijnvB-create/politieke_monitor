import { DetailPanel, NotFoundDetail } from "@/components/detail-panel";
import { documentResourceUrl, getLetterItemById } from "@/lib/tk";

type KamerbriefDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function KamerbriefDetailPage({ params }: KamerbriefDetailPageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const item = await getLetterItemById(decodedId);

  if (!item) {
    return <NotFoundDetail title="Kamerbrief niet gevonden" backHref="/kamerbrieven" backLabel="Terug naar Kamerbrieven" />;
  }

  return (
    <DetailPanel
      item={item}
      backHref="/kamerbrieven"
      backLabel="Terug naar Kamerbrieven"
      externalHref={documentResourceUrl(decodedId)}
      externalLabel="Open PDF"
    />
  );
}
