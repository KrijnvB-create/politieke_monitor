import { Files, Search } from "lucide-react";
import { ApiStatusPill } from "@/components/api-status-pill";
import { MonitorResultCard } from "@/components/monitor-result-card";
import { getDossiersOverview } from "@/lib/tk";

type DossiersPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function DossiersPage({ searchParams }: DossiersPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const dossiers = await getDossiersOverview(query);

  return (
    <main className="page-shell">
      <section className="section-heading search-heading">
        <div>
          <p className="eyebrow">Dossiers</p>
          <h1>Zaken, moties, amendementen en wetgeving.</h1>
        </div>
        <form className="search-form" action="/dossiers">
          <Search size={18} aria-hidden="true" />
          <input name="q" defaultValue={query} placeholder="Zoek op zaak, motie, wet of thema" />
          <button className="primary-button" type="submit">Zoek</button>
        </form>
      </section>

      <div className="result-count" aria-live="polite">
        <Files size={18} aria-hidden="true" />
        <strong>{dossiers.dossiers.length + dossiers.motions.length}</strong>
        <span>{query ? `items voor "${query}"` : "recente dossieritems"}</span>
        <ApiStatusPill apiOk={dossiers.apiOk} />
      </div>

      <section className="overview-grid two">
        <div>
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Kamerstukdossiers</p>
              <h2>Dossiers</h2>
            </div>
          </div>
          <div className="result-list">
            {dossiers.dossiers.map((item) => <MonitorResultCard item={item} key={`${item.kind}-${item.id}`} />)}
          </div>
        </div>

        <div>
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Nieuwe zaken</p>
              <h2>Moties en amendementen</h2>
            </div>
          </div>
          <div className="result-list">
            {dossiers.motions.map((item) => <MonitorResultCard item={item} key={`${item.kind}-${item.id}`} />)}
          </div>
        </div>
      </section>
    </main>
  );
}
