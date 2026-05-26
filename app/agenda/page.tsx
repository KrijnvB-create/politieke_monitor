import { CalendarDays, Search } from "lucide-react";
import { ApiStatusPill } from "@/components/api-status-pill";
import { MonitorResultCard } from "@/components/monitor-result-card";
import { getAgendaOverview } from "@/lib/tk";

type AgendaPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const agenda = await getAgendaOverview(query);

  return (
    <main className="page-shell">
      <section className="section-heading search-heading">
        <div>
          <p className="eyebrow">Agenda</p>
          <h1>Vergaderingen, debatten en eerdere plenaire momenten.</h1>
        </div>
        <form className="search-form" action="/agenda">
          <Search size={18} aria-hidden="true" />
          <input name="q" defaultValue={query} placeholder="Filter op onderwerp, zaal of soort debat" />
          <button className="primary-button" type="submit">Filter</button>
        </form>
      </section>

      <div className="result-count" aria-live="polite">
        <CalendarDays size={18} aria-hidden="true" />
        <strong>{agenda.planned.length + agenda.past.length}</strong>
        <span>{query ? `agenda-items voor "${query}"` : "agenda-items"}</span>
        <ApiStatusPill apiOk={agenda.apiOk} />
      </div>

      <section className="overview-grid two">
        <div>
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Komend en actueel</p>
              <h2>Activiteiten</h2>
            </div>
          </div>
          <div className="result-list">
            {agenda.planned.length === 0 ? (
              <div className="empty-state small">
                <p>Geen komende activiteiten gevonden.</p>
              </div>
            ) : (
              agenda.planned.map((item) => <MonitorResultCard item={item} key={`${item.kind}-${item.id}`} />)
            )}
          </div>
        </div>

        <div>
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Historie</p>
              <h2>Debatten uit het verleden</h2>
            </div>
          </div>
          <div className="result-list">
            {agenda.past.length === 0 ? (
              <div className="empty-state small">
                <p>Geen eerdere debatten gevonden.</p>
              </div>
            ) : (
              agenda.past.map((item) => <MonitorResultCard item={item} key={`${item.kind}-${item.id}`} />)
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
