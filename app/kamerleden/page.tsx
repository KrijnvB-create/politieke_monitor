import { ApiStatusPill } from "@/components/api-status-pill";
import { KamerledenExplorer } from "@/components/KamerledenExplorer";
import { getMembersOverview } from "@/lib/tk";

export default async function KamerledenPage() {
  const members = await getMembersOverview();

  return (
    <main className="page-shell">
      <div className="agenda-hero">
        <div>
          <p className="eyebrow">Kamerleden</p>
          <h1>Wie waarover gaat</h1>
        </div>
        <ApiStatusPill apiOk={members.apiOk} />
      </div>

      <KamerledenExplorer items={members.items} />
    </main>
  );
}
