import { Search } from "lucide-react";
import { MonitorResultCard } from "@/components/monitor-result-card";
import { searchMonitor } from "@/lib/tk";

type SearchPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const sections = await searchMonitor(query);
  const totalResults = sections.reduce((count, section) => count + section.items.length, 0);

  return (
    <main className="page-shell">
      <section className="section-heading search-heading">
        <div>
          <p className="eyebrow">Zoeken</p>
          <h1>Vind dossiers, Kamerleden, moties, stemmingen, Kamerbrieven en debatten.</h1>
        </div>
        <form className="search-form" action="/search">
          <Search size={18} aria-hidden="true" />
          <input name="q" defaultValue={query} placeholder="Zoek op thema, naam, dossier of debat" />
          <button className="primary-button" type="submit">
            Zoek
          </button>
        </form>
      </section>

      <section className="result-count" aria-live="polite">
        <strong>{totalResults}</strong>
        <span>{query ? `resultaten voor "${query}"` : "recente items"}</span>
      </section>

      <div className="search-results">
        {sections.map((section) => (
          <section className="result-section" key={section.id}>
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">{section.items.length} items</p>
                <h2>{section.title}</h2>
              </div>
            </div>
            {section.items.length === 0 ? (
              <div className="empty-state small">
                <p>Geen treffers gevonden.</p>
              </div>
            ) : (
              <div className="result-list">
                {section.items.map((item) => (
                  <MonitorResultCard item={item} key={`${item.kind}-${item.id}`} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
