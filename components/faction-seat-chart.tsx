import type { TkFaction } from "@/lib/tk";
import { factionColor } from "@/lib/factions";

export function FactionSeatChart({ factions }: { factions: TkFaction[] }) {
  const total = factions.reduce((sum, faction) => sum + (faction.AantalZetels ?? 0), 0) || 150;

  return (
    <section className="seat-chart" aria-label="Zetelverdeling per fractie">
      <div className="seat-stack">
        {factions.map((faction) => {
          const seats = faction.AantalZetels ?? 0;
          return (
            <span
              key={faction.Id ?? faction.Afkorting}
              title={`${faction.Afkorting}: ${seats} zetels`}
              style={{
                width: `${Math.max((seats / total) * 100, 1)}%`,
                background: factionColor(faction.Afkorting)
              }}
            />
          );
        })}
      </div>
      <div className="seat-list">
        {factions.map((faction) => (
          <div className="seat-row" key={faction.Id ?? faction.Afkorting}>
            <i style={{ background: factionColor(faction.Afkorting) }} />
            <strong>{faction.Afkorting}</strong>
            <span>{faction.AantalZetels ?? 0}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
