import { Activity, AlertCircle, CalendarDays, Database, ExternalLink, Landmark } from "lucide-react";
import { SaveButton } from "@/components/save-button";
import { activityDate, activityId, activityTitle, getRecentActivities, type TkActivity } from "@/lib/tk";

const focusDossiers = [
  {
    id: "klimaat-energie",
    label: "Klimaat en energie",
    meta: { thema: "energie", bron: "starter" }
  },
  {
    id: "zorg-en-wonen",
    label: "Zorg en wonen",
    meta: { thema: "sociaal", bron: "starter" }
  },
  {
    id: "digitalisering-ai",
    label: "Digitalisering en AI",
    meta: { thema: "digitalisering", bron: "starter" }
  }
];

export default async function HomePage() {
  let activities: TkActivity[] = [];
  let apiError = false;

  try {
    activities = await getRecentActivities();
  } catch {
    apiError = true;
  }

  return (
    <main className="dashboard">
      <section className="status-band">
        <div>
          <p className="eyebrow">Live monitor</p>
          <h1>Tweede Kamer in een werkbaar overzicht.</h1>
          <p>
            Recente activiteiten, vaste volgdossiers en persoonlijke bookmarks op een plek.
          </p>
        </div>
        <div className="status-metrics" aria-label="Status">
          <div>
            <Database size={18} aria-hidden="true" />
            <span>Open Data</span>
            <strong>{apiError ? "offline" : "live"}</strong>
          </div>
          <div>
            <Landmark size={18} aria-hidden="true" />
            <span>Bron</span>
            <strong>Tweede Kamer</strong>
          </div>
          <a href="https://opendata.tweedekamer.nl/" target="_blank" rel="noreferrer">
            <ExternalLink size={18} aria-hidden="true" />
            Open Data Portaal
          </a>
        </div>
      </section>

      <section className="content-grid">
        <div className="main-column">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Activiteiten</p>
              <h2>Recent gewijzigd</h2>
            </div>
            <CalendarDays size={22} aria-hidden="true" />
          </div>

          {apiError ? (
            <div className="warning-panel">
              <AlertCircle size={20} aria-hidden="true" />
              <div>
                <h3>Open Data is tijdelijk niet bereikbaar</h3>
                <p>De app blijft werken; probeer straks opnieuw of deploy met caching in een volgende ronde.</p>
              </div>
            </div>
          ) : activities.length === 0 ? (
            <div className="empty-state">
              <h3>Geen recente activiteiten gevonden</h3>
              <p>De Open Data API gaf een lege lijst terug.</p>
            </div>
          ) : (
            <div className="activity-list">
              {activities.map((activity) => {
                const id = activityId(activity);
                const title = activityTitle(activity);

                return (
                  <article className="activity-card" key={id}>
                    <div className="activity-icon">
                      <Activity size={18} aria-hidden="true" />
                    </div>
                    <div className="activity-body">
                      <div className="activity-meta">
                        <span>{activity.Soort ?? "Activiteit"}</span>
                        <span>{activityDate(activity)}</span>
                      </div>
                      <h3>{title}</h3>
                      <p>{activity.Status ?? "Status onbekend"}</p>
                    </div>
                    <SaveButton kind="activiteit" refId={id} label={title} meta={activity} />
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="side-column">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Volgen</p>
              <h2>Focusdossiers</h2>
            </div>
          </div>
          <div className="dossier-list">
            {focusDossiers.map((dossier) => (
              <article className="dossier-card" key={dossier.id}>
                <div>
                  <h3>{dossier.label}</h3>
                  <p>Bewaar dit dossier om het later terug te vinden.</p>
                </div>
                <SaveButton kind="dossier" refId={dossier.id} label={dossier.label} meta={dossier.meta} />
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
