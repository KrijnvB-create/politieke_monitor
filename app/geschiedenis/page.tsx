import { ApiStatusPill } from "@/components/api-status-pill";
import { AgendaExplorer } from "@/components/AgendaExplorer";
import { getGeschiedenisOverview } from "@/lib/tk";

export default async function GeschiedenisPage() {
  const geschiedenis = await getGeschiedenisOverview();

  return (
    <main className="page-shell">
      <div className="agenda-hero">
        <div>
          <p className="eyebrow">Geschiedenis</p>
          <h1>Wat er al is gebeurd in de Kamer</h1>
        </div>
        <ApiStatusPill apiOk={geschiedenis.apiOk} />
      </div>

      <AgendaExplorer items={geschiedenis.items} mode="geschiedenis" />
    </main>
  );
}
