import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { SaveButton } from "@/components/save-button";
import type { MonitorItem } from "@/lib/tk";

type DetailPanelProps = {
  item: MonitorItem;
  backHref: string;
  backLabel: string;
  externalHref?: string;
  externalLabel?: string;
};

function printable(value: unknown) {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
}

export function DetailPanel({ item, backHref, backLabel, externalHref, externalLabel = "Open bron" }: DetailPanelProps) {
  const details = Object.entries(item.meta ?? {})
    .map(([key, value]) => [key, printable(value)] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]))
    .slice(0, 18);

  return (
    <main className="page-shell detail-page">
      <Link className="text-link back-link" href={backHref}>
        <ArrowLeft size={16} aria-hidden="true" />
        {backLabel}
      </Link>

      <section className="detail-panel">
        <div>
          <p className="eyebrow">{item.eyebrow}</p>
          <h1>{item.title}</h1>
          <p>{item.description || item.status || "Geen extra omschrijving beschikbaar."}</p>
        </div>

        <div className="detail-actions">
          {externalHref ? (
            <a className="secondary-button" href={externalHref} target="_blank" rel="noreferrer">
              <ExternalLink size={16} aria-hidden="true" />
              {externalLabel}
            </a>
          ) : null}
          <SaveButton kind={item.kind} refId={item.id} label={item.title} meta={item.meta} />
        </div>
      </section>

      <section className="quiet-panel detail-meta">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Details</p>
            <h2>Gegevens uit de Tweede Kamer-feed</h2>
          </div>
        </div>
        {details.length === 0 ? (
          <p>Geen extra velden beschikbaar.</p>
        ) : (
          <dl className="detail-grid">
            {details.map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </main>
  );
}

export function NotFoundDetail({ title, backHref, backLabel }: { title: string; backHref: string; backLabel: string }) {
  return (
    <main className="page-shell detail-page">
      <Link className="text-link back-link" href={backHref}>
        <ArrowLeft size={16} aria-hidden="true" />
        {backLabel}
      </Link>
      <section className="empty-state dashboard-empty">
        <div>
          <p className="eyebrow">Niet gevonden</p>
          <h1>{title}</h1>
          <p>Dit item kon niet uit de live Tweede Kamer-feed worden geladen.</p>
        </div>
      </section>
    </main>
  );
}
