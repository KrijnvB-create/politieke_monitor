import { ApiStatusPill } from "@/components/api-status-pill";
import { KamerbrievenExplorer } from "@/components/KamerbrievenExplorer";
import { getKamerbrievenOverviewDb } from "@/lib/db";

export default async function KamerbrievenPage() {
  const rows = await getKamerbrievenOverviewDb();

  return (
    <main className="page-shell">
      <div className="agenda-hero">
        <div>
          <p className="eyebrow">Kamerbrieven</p>
          <h1>Wat het kabinet naar de Kamer stuurt</h1>
        </div>
        <ApiStatusPill apiOk={rows.length > 0} />
      </div>

      <KamerbrievenExplorer rows={rows} />
    </main>
  );
}
