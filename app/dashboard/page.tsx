import Link from "next/link";
import { Activity, Bookmark, UserCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { MonitorResultCard } from "@/components/monitor-result-card";
import { savedKindLabel, type SavedItemRecord } from "@/lib/saved-items";
import { createClient } from "@/lib/supabase/server";
import { getDashboardDevelopments } from "@/lib/tk";

function WatchList({ title, items }: { title: string; items: SavedItemRecord[] }) {
  return (
    <section className="watch-panel">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">{items.length} gevolgd</p>
          <h2>{title}</h2>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="quiet-text">Nog leeg.</p>
      ) : (
        <div className="watch-list">
          {items.map((item) => (
            <div className="watch-chip" key={item.id}>
              <span>{savedKindLabel(item.kind)}</span>
              <strong>{item.label ?? item.ref_id}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: items } = await supabase
    .from("saved_items")
    .select("id, kind, ref_id, label, meta, created_at")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  const savedItems = (items ?? []) as SavedItemRecord[];
  const dashboard = await getDashboardDevelopments(savedItems);

  return (
    <main className="page-shell">
      <section className="dashboard-heading">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Recente ontwikkelingen in wat je volgt.</h1>
        </div>
        <div className="dashboard-actions">
          <Link className="secondary-button" href="/search">
            <Bookmark size={18} aria-hidden="true" />
            Volgen
          </Link>
          <Link className="primary-button" href="/agenda">
            <Activity size={18} aria-hidden="true" />
            Agenda
          </Link>
        </div>
      </section>

      {savedItems.length === 0 ? (
        <section className="empty-state dashboard-empty">
          <UserCircle size={24} aria-hidden="true" />
          <div>
            <h2>Nog geen volgprofiel</h2>
            <p>Zoek een thema, Kamerlid, motie, stemming, Kamerbrief of debat en bewaar het.</p>
          </div>
          <Link className="primary-button inline-flex" href="/search">
            Naar zoeken
          </Link>
        </section>
      ) : (
        <section className="dashboard-grid">
          <aside className="watch-column">
            <WatchList title="Thema's en dossiers" items={dashboard.themes} />
            <WatchList title="Kamerleden" items={dashboard.members} />
            <WatchList title="Debatten" items={dashboard.debates} />
          </aside>

          <div className="development-column">
            <section>
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">{dashboard.developments.length} matches</p>
                  <h2>Nieuwe signalen</h2>
                </div>
              </div>
              {dashboard.developments.length === 0 ? (
                <div className="empty-state small">
                  <p>Geen recente matches gevonden.</p>
                </div>
              ) : (
                <div className="result-list">
                  {dashboard.developments.map((item) => (
                    <MonitorResultCard compact item={item} key={`${item.kind}-${item.id}`} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="section-heading compact stacked">
                <div>
                  <p className="eyebrow">Laatste Kamerbreed</p>
                  <h2>Stemmingen</h2>
                </div>
              </div>
              <div className="result-list">
                {dashboard.votes.map((item) => (
                  <MonitorResultCard compact item={item} key={`${item.kind}-${item.id}`} />
                ))}
              </div>
            </section>
          </div>
        </section>
      )}
    </main>
  );
}
