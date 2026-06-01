/**
 * components/TimelineCard.tsx
 * Tijdlijnkaart voor dossierdetailpagina
 */

import Link from 'next/link';
import { TimelineItem, TimelineItemType, formatDate } from '@/lib/tk';
import { RelationChipGroup } from './RelationChip';

// ─── Type label & kleur config ───────────────────────────────────────────────

const TYPE_CONFIG: Record<
  TimelineItemType,
  { label: string; color: string; dot: string; href: (id: string) => string }
> = {
  motie:      { label: 'Motie',       color: 'bg-rose-100 text-rose-700',    dot: 'bg-rose-400',    href: (id) => `/moties/${id}` },
  kamerbrief: { label: 'Kamerbrief',  color: 'bg-teal-100 text-teal-700',    dot: 'bg-teal-400',    href: (id) => `/kamerbrieven/${id}` },
  debat:      { label: 'Debat',       color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400', href: (id) => `/debatten/${id}` },
  stemming:   { label: 'Stemming',    color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400', href: (id) => `/stemmingen/${id}` },
  toezegging: { label: 'Toezegging',  color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400',  href: (id) => `/toezeggingen/${id}` },
  verslag:    { label: 'Verslag',     color: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400',  href: (id) => `/verslagen/${id}` },
  document:   { label: 'Document',    color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400',   href: (id) => `/documenten/${id}` },
  zaak:       { label: 'Zaak',        color: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400',  href: (id) => `/zaken/${id}` },
};

// ─── Kabinetsappreciatie badge ───────────────────────────────────────────────

function KabApprec({ value }: { value?: string }) {
  if (!value || value === 'Niet beschikbaar bij gewijzigde moties en/of amendementen') return null;
  const color =
    value === 'Oordeel Kamer'  ? 'bg-green-100 text-green-700' :
    value === 'Ontraden'       ? 'bg-red-100 text-red-700' :
    value === 'Overgenomen'    ? 'bg-emerald-100 text-emerald-700' :
    'bg-slate-100 text-slate-600';
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${color}`}>
      {value}
    </span>
  );
}

// ─── TimelineCard ────────────────────────────────────────────────────────────

interface TimelineCardProps {
  item: TimelineItem;
}

export function TimelineCard({ item }: TimelineCardProps) {
  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.document;
  const href = cfg.href(item.id);

  const kamerledChips = (item.kamerleden ?? []).map((k) => ({
    variant: 'kamerlid' as const,
    label: k.naam,
    href: `/kamerleden/${k.id}`,
    sub: k.fractie,
  }));

  const fractieChips = (item.fracties ?? []).map((f) => ({
    variant: 'fractie' as const,
    label: f.afkorting ?? f.naam,
    href: `/fracties/${f.id}`,
  }));

  const commissieChips = (item.commissies ?? []).map((c) => ({
    variant: 'commissie' as const,
    label: c.afkorting ?? c.naam,
    href: `/commissies/${c.id}`,
  }));

  const allChips = [...commissieChips, ...fractieChips, ...kamerledChips];

  return (
    <div className="group relative flex gap-4">
      {/* Tijdlijn vertikale lijn + dot */}
      <div className="flex flex-col items-center">
        <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        <div className="w-px flex-1 bg-slate-200 mt-1" />
      </div>

      {/* Kaart */}
      <div className="flex-1 pb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-sm transition-all">
          {/* Header rij */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cfg.color}`}>
                {cfg.label}
              </span>
              {item.status && (
                <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                  {item.status}
                </span>
              )}
              <KabApprec value={item.kabinetsappreciatie} />
            </div>
            <time className="text-xs text-slate-400 flex-shrink-0 mt-0.5">
              {formatDate(item.date)}
            </time>
          </div>

          {/* Titel */}
          <Link
            href={href}
            className="text-sm font-medium text-slate-900 hover:text-blue-700 leading-snug block mb-2"
          >
            {item.title}
          </Link>

          {/* Onderwerp */}
          {item.onderwerp && item.onderwerp !== item.title && (
            <p className="text-xs text-slate-500 mb-2 leading-relaxed line-clamp-2">
              {item.onderwerp}
            </p>
          )}

          {/* Relatiechips */}
          {allChips.length > 0 && (
            <RelationChipGroup chips={allChips} max={6} />
          )}
        </div>
      </div>
    </div>
  );
}
