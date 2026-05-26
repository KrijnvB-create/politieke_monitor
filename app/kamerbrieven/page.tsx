import { FileText, Search } from "lucide-react";
import { ApiStatusPill } from "@/components/api-status-pill";
import { SaveButton } from "@/components/save-button";
import { documentResourceUrl, getLettersOverview } from "@/lib/tk";

type KamerbrievenPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

function stringMeta(meta: Record<string, unknown>, key: string) {
  const value = meta[key];
  return typeof value === "string" ? value : undefined;
}

export default async function KamerbrievenPage({ searchParams }: KamerbrievenPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const letters = await getLettersOverview(query);

  return (
    <main className="page-shell">
      <section className="section-heading search-heading">
        <div>
          <p className="eyebrow">Kamerbrieven</p>
          <h1>Brieven van de regering uit de Document-feed.</h1>
        </div>
        <form className="search-form" action="/kamerbrieven">
          <Search size={18} aria-hidden="true" />
          <input name="q" defaultValue={query} placeholder="Zoek in onderwerp, titel of documentnummer" />
          <button className="primary-button" type="submit">Zoek</button>
        </form>
      </section>

      <div className="result-count" aria-live="polite">
        <strong>{letters.items.length}</strong>
        <span>{query ? `Kamerbrieven voor "${query}"` : "recente Kamerbrieven"}</span>
        <ApiStatusPill apiOk={letters.apiOk} />
      </div>

      <section className="result-list list-page">
        {letters.items.map((item) => {
          const documentId = stringMeta(item.meta, "Id") ?? item.id;
          const resourceUrl = documentResourceUrl(documentId);

          return (
            <article className="result-card letter-card" key={`${item.kind}-${item.id}`}>
              <div className="result-main">
                <div className="result-meta">
                  <span>{item.eyebrow}</span>
                  <span>{item.date}</span>
                  {item.status ? <span>{item.status}</span> : null}
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="letter-actions">
                  {resourceUrl ? (
                    <a className="secondary-button inline-flex" href={resourceUrl} target="_blank" rel="noreferrer">
                      <FileText size={16} aria-hidden="true" />
                      PDF
                    </a>
                  ) : null}
                </div>
              </div>
              <SaveButton kind="kamerbrief" refId={item.id} label={item.title} meta={item.meta} />
            </article>
          );
        })}
      </section>
    </main>
  );
}
