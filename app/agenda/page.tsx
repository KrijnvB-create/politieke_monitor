import Link from "next/link";
import { CalendarClock, CalendarDays, FileText } from "lucide-react";
import { ApiStatusPill } from "@/components/api-status-pill";
import { AgendaExplorer } from "@/components/AgendaExplorer";
import { getAgendaOverview, getExpectedDebates, formatDate } from "@/lib/tk";

export default async function AgendaPage() {
  const [agenda, expected] = await Promise.all([getAgendaOverview(), getExpectedDebates()]);
  const expectedWithDate = expected.items.filter((d) => d.datum);
  const expectedWithoutDate = expected.items.filter((d) => !d.datum);

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

      {expected.items.length > 0 ? (
        <section style={{ paddingTop: 48 }}>
          <div className="section-divider">
            <strong>
              <CalendarClock size={18} aria-hidden="true" color="#512986" />
              Nog te bevestigen
            </strong>
            <hr />
            <em>Uit besluitenlijsten van procedurevergaderingen</em>
          </div>

          {expectedWithDate.length > 0 ? (
            <>
              <p className="eyebrow" style={{ marginTop: 8 }}>
                Datum bekend, tijd nog niet vastgesteld
              </p>
              <div className="item-card-list">
                {expectedWithDate.map((d) => (
                  <div className="item-card" key={d.id}>
                    <span className="item-card-icon">
                      <CalendarClock size={19} aria-hidden="true" />
                    </span>
                    <div className="item-card-body">
                      <Link href={`/agenda/${encodeURIComponent(d.bronActiviteitId)}`}>{d.onderwerp}</Link>
                      <p>
                        Besloten in de procedurevergadering {d.commissie} van {formatDate(d.bronDatum)}.
                      </p>
                      <div className="item-card-tags">
                        <span className="item-card-tag">{d.type}</span>
                        <span className="item-card-meta">{d.commissieAfkorting ?? d.commissie}</span>
                        <span className="item-card-meta">
                          <CalendarDays size={13} aria-hidden="true" />
                          {formatDate(d.datum!)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {expectedWithoutDate.length > 0 ? (
            <>
              <p className="eyebrow" style={{ marginTop: 32 }}>
                Nog te plannen
              </p>
              <div className="item-card-list">
                {expectedWithoutDate.map((d) => (
                  <div className="item-card" key={d.id}>
                    <span className="item-card-icon">
                      <CalendarClock size={19} aria-hidden="true" />
                    </span>
                    <div className="item-card-body">
                      <Link href={`/agenda/${encodeURIComponent(d.bronActiviteitId)}`}>{d.onderwerp}</Link>
                      <p>
                        Besloten in de procedurevergadering {d.commissie} van {formatDate(d.bronDatum)}.
                      </p>
                      <div className="item-card-tags">
                        <span className="item-card-tag">{d.type}</span>
                        <span className="item-card-meta">{d.commissieAfkorting ?? d.commissie}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </section>
      ) : null}

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
