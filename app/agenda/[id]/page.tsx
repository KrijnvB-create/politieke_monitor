import { DetailPanel, NotFoundDetail } from "@/components/detail-panel";
import { getAgendaItemById } from "@/lib/tk";

type AgendaDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AgendaDetailPage({ params }: AgendaDetailPageProps) {
  const { id } = await params;
  const item = await getAgendaItemById(decodeURIComponent(id));

  if (!item) {
    return <NotFoundDetail title="Agenda-item niet gevonden" backHref="/agenda" backLabel="Terug naar agenda" />;
  }

  return <DetailPanel item={item} backHref="/agenda" backLabel="Terug naar agenda" />;
}
