import { CalendarRange, Search } from "lucide-react";
import { MonitorResultCard } from "@/components/monitor-result-card";
import { getDebateOverview } from "@/lib/tk";

type DebatesPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function DebatesPage({ searchParams }: DebatesPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const { planned, past } = await getDebateOverview(query);

  return (
    <main className="page-shell">
      <section className="section-heading search-heading">
        <div>
          <p className="eyebrow">Debatten</p>
          <h1>Geplande en afgelopen debatten.</h1>
        </div>
        <form className="search-form" action="/debatten">
          <Search size={18} aria-hidden="true" />
          <input name="q" defaultValue={query} placeholder="Zoek in debatten" />
          <button className="primary-button" type="submit">
            Zoek
          </button>
        </form>
      </section>

      <section className="debate-grid">
        <div>
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Agenda</p>
              <h2>Geplande debatten</h2>
            </div>
            <CalendarRange size={22} aria-hidden="true" />
          </div>
          <div className="result-list">
            {planned.length === 0 ? (
              <div className="empty-state small">
                <p>Geen geplande debatten gevonden.</p>
              </div>
            ) : (
              planned.map((item) => <MonitorResultCard item={item} key={`${item.kind}-${item.id}`} />)
            )}
          </div>
        </div>

        <div>
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Archief</p>
              <h2>Afgelopen debatten</h2>
            </div>
          </div>
          <div className="result-list">
            {past.length === 0 ? (
              <div className="empty-state small">
                <p>Geen afgelopen debatten gevonden.</p>
              </div>
            ) : (
              past.map((item) => <MonitorResultCard item={item} key={`${item.kind}-${item.id}`} />)
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
