import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { MonitorItem } from "@/lib/tk";
import { SaveButton } from "@/components/save-button";

type MonitorResultCardProps = {
  item: MonitorItem;
  compact?: boolean;
};

function itemHref(item: MonitorItem) {
  const id = encodeURIComponent(item.id);

  if (item.kind === "dossier" || item.kind === "motie") {
    return `/dossiers/${id}`;
  }

  if (item.kind === "kamerlid") {
    return `/kamerleden/${id}`;
  }

  if (item.kind === "fractie") {
    return `/fracties/${id}`;
  }

  if (item.kind === "kamerbrief") {
    return `/kamerbrieven/${id}`;
  }

  if (item.kind === "stemming") {
    return `/stemmingen/${id}`;
  }

  if (item.kind === "thema") {
    return `/search?q=${encodeURIComponent(item.title)}`;
  }

  return `/agenda/${id}`;
}

export function MonitorResultCard({ item, compact = false }: MonitorResultCardProps) {
  return (
    <article className={compact ? "result-card compact" : "result-card"}>
      <div className="result-main">
        <div className="result-meta">
          <span>{item.eyebrow}</span>
          <span>
            <CalendarDays size={14} aria-hidden="true" />
            {item.date}
          </span>
          {item.status ? <span>{item.status}</span> : null}
        </div>
        <h3>
          <Link className="result-title-link" href={itemHref(item)}>
            {item.title}
          </Link>
        </h3>
        {item.description ? <p>{item.description}</p> : null}
        {item.matchedOn ? <p className="match-label">Match: {item.matchedOn}</p> : null}
      </div>
      <div className="result-actions">
        <Link className="secondary-button inline-flex" href={itemHref(item)}>
          Open
        </Link>
        <SaveButton kind={item.kind} refId={item.id} label={item.title} meta={item.meta} />
      </div>
    </article>
  );
}
