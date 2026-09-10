import { ApiStatusPill } from "@/components/api-status-pill";
import { DossiersExplorer } from "@/components/DossiersExplorer";
import { getDossiersOverviewDb } from "@/lib/db";

export default async function DossiersPage() {
  const rows = await getDossiersOverviewDb();

  return (
    <main className="page-shell">
      <div className="agenda-hero">
        <div>
          <p className="eyebrow">Dossiers</p>
          <h1>Waar de Kamer aan werkt</h1>
        </div>
        <ApiStatusPill apiOk={rows.length > 0} />
      </div>

      <DossiersExplorer rows={rows} />
    </main>
  );
}

export const metadata = {
  title: "Dossiers - Politiekemonitor",
};
