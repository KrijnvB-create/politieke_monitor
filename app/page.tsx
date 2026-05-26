import Link from "next/link";
import { Activity, ArrowRight, Bell, CalendarDays, FileText, Landmark } from "lucide-react";
import { ApiStatusPill } from "@/components/api-status-pill";
import { FactionSeatChart } from "@/components/faction-seat-chart";
import { MonitorResultCard } from "@/components/monitor-result-card";
import { VoteCard } from "@/components/vote-card";
import { getKamerkompasOverview, reportResourceUrl } from "@/lib/tk";

export default async function HomePage() {
  const overview = await getKamerkompasOverview();
  const activeReport = overview.reports[0];
  const activeReportUrl = reportResourceUrl(activeReport?.Id);

  return (
    <main className="dashboard">
      <section className="status-band kamerkompas-hero">
        <div>
          <p className="eyebrow">Kamerkompas</p>
          <h1>Dagdashboard voor de Tweede Kamer.</h1>
          <p>Agenda, stemmingen, moties, Kamerbrieven, toezeggingen en fracties in een werkbaar overzicht.</p>
        </div>
        <div className="status-metrics" aria-label="Status">
          <div>
            <Activity size={18} aria-hidden="true" />
            <span>Datastatus</span>
            <strong>
              <ApiStatusPill apiOk={overview.apiOk} />
            </strong>
          </div>
          <div>
            <Landmark size={18} aria-hidden="true" />
            <span>Bron</span>
            <strong>Open Data</strong>
          </div>
          <Link href="/search">
            <ArrowRight size={18} aria-hidden="true" />
            Zoek door de Kamer
          </Link>
        </div>
      </section>

      <section className="ticker-band" aria-label="Recente wijzigingen">
        <strong>Recente wijzigingen</strong>
        <div>
          {overview.ticker.slice(0, 5).map((item) => (
            <span key={`${item.kind}-${item.id}`}>{item.title}</span>
          ))}
        </div>
      </section>

      <section className="content-grid wide">
        <div className="main-column">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Nu in de Kamer</p>
              <h2>Live-strip</h2>
            </div>
            <Activity size={22} aria-hidden="true" />
          </div>
          <div className="result-list">
            {overview.now.length === 0 ? (
              <div className="empty-state small">
                <p>Er loopt volgens de feed nu geen openbare activiteit.</p>
              </div>
            ) : (
              overview.now.map((item) => <MonitorResultCard compact item={item} key={`${item.kind}-${item.id}`} />)
            )}
          </div>

          {activeReport ? (
            <section className="zaal-block">
              <div>
                <p className="eyebrow">Vers uit de zaal</p>
                <h2>{activeReport.Soort ?? "Ongecorrigeerd verslag"}</h2>
                <p>{activeReport.Status ?? "Verslag beschikbaar"} / {activeReport.ContentType ?? "publicatie"}</p>
              </div>
              <a className="secondary-button" href={activeReportUrl ?? "/verslag"} target={activeReportUrl ? "_blank" : undefined} rel="noreferrer">
                <FileText size={18} aria-hidden="true" />
                Open verslag
              </a>
            </section>
          ) : null}

          <div className="section-heading compact stacked">
            <div>
              <p className="eyebrow">Stemmingen</p>
              <h2>Recente uitslagen</h2>
            </div>
            <Link className="text-link" href="/stemmingen">Alles</Link>
          </div>
          <div className="result-list">
            {overview.votes.map((vote) => <VoteCard vote={vote} key={vote.id} />)}
          </div>
        </div>

        <aside className="side-column">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Weekagenda</p>
              <h2>Komende dagen</h2>
            </div>
            <CalendarDays size={22} aria-hidden="true" />
          </div>
          <div className="result-list">
            {overview.weekAgenda.slice(0, 6).map((item) => (
              <MonitorResultCard compact item={item} key={`${item.kind}-${item.id}`} />
            ))}
          </div>

          <div className="section-heading compact stacked">
            <div>
              <p className="eyebrow">Zetelverdeling</p>
              <h2>Fracties</h2>
            </div>
            <Link className="text-link" href="/fracties">Details</Link>
          </div>
          <FactionSeatChart factions={overview.factions} />
        </aside>
      </section>

      <section className="overview-grid">
        <div>
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Nieuw</p>
              <h2>Moties en amendementen</h2>
            </div>
            <Link className="text-link" href="/dossiers">Dossiers</Link>
          </div>
          <div className="result-list">
            {overview.motions.map((item) => <MonitorResultCard compact item={item} key={`${item.kind}-${item.id}`} />)}
          </div>
        </div>
        <div>
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Kamerbrieven</p>
              <h2>Recent ontvangen</h2>
            </div>
            <Link className="text-link" href="/kamerbrieven">Alle brieven</Link>
          </div>
          <div className="result-list">
            {overview.letters.map((item) => <MonitorResultCard compact item={item} key={`${item.kind}-${item.id}`} />)}
          </div>
        </div>
        <div>
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Toezeggingen</p>
              <h2>Nieuwe toezeggingen</h2>
            </div>
            <Bell size={20} aria-hidden="true" />
          </div>
          <div className="result-list">
            {overview.pledges.map((item) => <MonitorResultCard compact item={item} key={`${item.kind}-${item.id}`} />)}
          </div>
        </div>
      </section>
    </main>
  );
}
