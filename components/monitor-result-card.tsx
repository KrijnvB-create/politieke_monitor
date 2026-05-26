import { CalendarDays } from "lucide-react";
import type { MonitorItem } from "@/lib/tk";
import { SaveButton } from "@/components/save-button";

type MonitorResultCardProps = {
  item: MonitorItem;
  compact?: boolean;
};

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
        <h3>{item.title}</h3>
        {item.description ? <p>{item.description}</p> : null}
        {item.matchedOn ? <p className="match-label">Match: {item.matchedOn}</p> : null}
      </div>
      <SaveButton kind={item.kind} refId={item.id} label={item.title} meta={item.meta} />
    </article>
  );
}
