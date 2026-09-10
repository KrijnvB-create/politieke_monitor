/**
 * components/DossierTimelineList.tsx
 * Client-side lijst voor de dossier-tijdlijn: houdt bij welke items de
 * kijker heeft verborgen (per dossier, in localStorage) en toont een
 * "N verborgen tonen"-schakelaar.
 */

'use client';

import { useEffect, useState } from 'react';
import { EyeOff } from 'lucide-react';
import type { TimelineItem } from '@/lib/tk';
import { TimelineCard, type MotieVoteResult } from './TimelineCard';

type TimelineItemWithVote = TimelineItem & { voteResult?: MotieVoteResult };

interface DossierTimelineListProps {
  dossierId: string;
  items: TimelineItemWithVote[];
  emptyLabel: string;
}

function itemKey(item: TimelineItem) {
  return `${item.type}-${item.id}`;
}

function hiddenStorageKey(dossierId: string) {
  return `dossier:${dossierId}:verborgen`;
}

export function DossierTimelineList({ dossierId, items, emptyLabel }: DossierTimelineListProps) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(hiddenStorageKey(dossierId));
      if (raw) setHidden(new Set(JSON.parse(raw)));
    } catch {
      // localStorage niet beschikbaar; verborgen-status is dan alleen sessie-lokaal.
    }
  }, [dossierId]);

  function persistHidden(next: Set<string>) {
    setHidden(next);
    try {
      window.localStorage.setItem(hiddenStorageKey(dossierId), JSON.stringify(Array.from(next)));
    } catch {
      // negeren: localStorage kan geblokkeerd zijn (prive-navigatie e.d.)
    }
  }

  function toggleHide(key: string) {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    persistHidden(next);
  }

  const hiddenCount = items.filter((item) => hidden.has(itemKey(item))).length;
  const visible = showHidden ? items : items.filter((item) => !hidden.has(itemKey(item)));

  return (
    <div>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowHidden((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 mb-4 rounded-full border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors"
        >
          <EyeOff size={12} aria-hidden="true" />
          {showHidden ? 'Verborgen items weer verbergen' : `${hiddenCount} verborgen item${hiddenCount === 1 ? '' : 's'} tonen`}
        </button>
      )}

      {visible.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-base">Geen {emptyLabel} gevonden</p>
          <p className="text-sm mt-1">Probeer een ander filter</p>
        </div>
      ) : (
        <div>
          {visible.map((item) => {
            const key = itemKey(item);
            return (
              <TimelineCard
                key={key}
                item={item}
                voteResult={item.voteResult}
                hidden={hidden.has(key)}
                onToggleHide={() => toggleHide(key)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
