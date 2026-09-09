import Link from "next/link";
import { CalendarDays, FileText } from "lucide-react";
import { ApiStatusPill } from "@/components/api-status-pill";
import { AgendaExplorer } from "@/components/AgendaExplorer";
import { getAgendaOverview } from "@/lib/tk";

export default async function AgendaPage() {
  const agenda = await getAgendaOverview();

  return (
    <main className="page-shell">
      <div className="agenda-hero">
        <div>
          <p className="eyebrow">Agenda</p>
          <h1>Wat komt er aan in de Kamer</h1>
        </div>
        <ApiStatusPill apiOk={agenda.apiOk} />
      </div>

      <AgendaExplorer items={agenda.planned} />

      {agenda.past.length > 0 ? (
        <section style={{ paddingTop: 48 }}>
          <div className="section-divider">
            <strong>
              <FileText size={18} aria-hidden="true" color="#512986" />
              Historie
            </strong>
            <hr />
            <em>{agenda.past.length} eerdere debatten</em>
          </div>
          <div className="item-card-list">
            {agenda.past.map((item) => (
              <div className="item-card" key={`${item.kind}-${item.id}`}>
                <span className="item-card-icon">
                  <CalendarDays size={19} aria-hidden="true" />
                </span>
                <div className="item-card-body">
                  <Link href={`/agenda/${encodeURIComponent(item.id)}`}>{item.title}</Link>
                  {item.description ? <p>{item.description}</p> : null}
                  <div className="item-card-tags">
                    <span className="item-card-tag">{item.eyebrow}</span>
                    <span className="item-card-meta">
                      <CalendarDays size={13} aria-hidden="true" />
                      {item.date}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
