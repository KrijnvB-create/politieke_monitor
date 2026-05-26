import { Landmark } from "lucide-react";
import { ApiStatusPill } from "@/components/api-status-pill";
import { FactionSeatChart } from "@/components/faction-seat-chart";
import { SaveButton } from "@/components/save-button";
import { factionColor } from "@/lib/factions";
import { getFactionsOverview } from "@/lib/tk";

export default async function FractiesPage() {
  const factions = await getFactionsOverview();
  const totalSeats = factions.items.reduce((sum, faction) => sum + (faction.AantalZetels ?? 0), 0);

  return (
    <main className="page-shell">
      <section className="section-heading dashboard-heading">
        <div>
          <p className="eyebrow">Fracties</p>
          <h1>Zetelverdeling en partijoverzicht.</h1>
        </div>
        <div className="quiet-panel source-panel">
          <Landmark size={22} aria-hidden="true" />
          <div>
            <strong>{totalSeats} zetels</strong>
            <ApiStatusPill apiOk={factions.apiOk} />
          </div>
        </div>
      </section>

      <section className="fracties-layout">
        <FactionSeatChart factions={factions.items} />

        <div className="faction-grid">
          {factions.items.map((faction) => {
            const label = faction.Afkorting ?? faction.NaamNL ?? "Fractie";
            const id = faction.Id ?? label;

            return (
              <article className="faction-card" key={id} style={{ borderTopColor: factionColor(label) }}>
                <div className="faction-swatch" style={{ backgroundColor: factionColor(label) }} aria-hidden="true" />
                <div>
                  <p className="eyebrow">{faction.AantalZetels ?? 0} zetels</p>
                  <h2>{label}</h2>
                  {faction.NaamNL && faction.NaamNL !== label ? <p>{faction.NaamNL}</p> : null}
                </div>
                <SaveButton kind="fractie" refId={id} label={label} meta={{ ...faction }} />
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
