import { Search, UserCircle } from "lucide-react";
import { ApiStatusPill } from "@/components/api-status-pill";
import { SaveButton } from "@/components/save-button";
import { factionColor } from "@/lib/factions";
import { getMembersOverview, personResourceUrl } from "@/lib/tk";

type KamerledenPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

function stringMeta(meta: Record<string, unknown>, key: string) {
  const value = meta[key];
  return typeof value === "string" ? value : undefined;
}

export default async function KamerledenPage({ searchParams }: KamerledenPageProps) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const members = await getMembersOverview(query);

  return (
    <main className="page-shell">
      <section className="section-heading search-heading">
        <div>
          <p className="eyebrow">Kamerleden</p>
          <h1>Persoonlijke profielen met fractie en bewaarknop.</h1>
        </div>
        <form className="search-form" action="/kamerleden">
          <Search size={18} aria-hidden="true" />
          <input name="q" defaultValue={query} placeholder="Zoek Kamerlid op naam" />
          <button className="primary-button" type="submit">Zoek</button>
        </form>
      </section>

      <div className="result-count" aria-live="polite">
        <UserCircle size={18} aria-hidden="true" />
        <strong>{members.items.length}</strong>
        <span>{query ? `Kamerleden voor "${query}"` : "Kamerleden"}</span>
        <ApiStatusPill apiOk={members.apiOk} />
      </div>

      <section className="member-grid">
        {members.items.map((item) => {
          const faction = stringMeta(item.meta, "Fractielabel");
          const personId = stringMeta(item.meta, "Id") ?? item.id;
          const photoUrl = personResourceUrl(personId);
          const initial = item.title.trim().charAt(0).toUpperCase() || "?";

          return (
            <article className="member-card" key={`${item.kind}-${item.id}`} style={{ borderTopColor: factionColor(faction) }}>
              <div className="member-avatar" style={{ backgroundColor: factionColor(faction) }}>
                {photoUrl ? <img src={photoUrl} alt="" loading="lazy" /> : null}
                <span>{initial}</span>
              </div>
              <div className="member-body">
                <div className="result-meta">
                  <span>{faction ?? "Fractie onbekend"}</span>
                  <span>{item.status ?? "Kamerlid"}</span>
                </div>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </div>
              <SaveButton kind="kamerlid" refId={item.id} label={item.title} meta={item.meta} />
            </article>
          );
        })}
      </section>
    </main>
  );
}
