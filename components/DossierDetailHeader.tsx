/**
 * components/DossierDetailHeader.tsx
 * Header voor de dossierdetailpagina
 */

import { Kamerstukdossier, buildTimeline, formatDate, persoonNaam } from '@/lib/tk';
import { RelationChip, RelationChipGroup } from './RelationChip';
import { FollowButton } from './FollowButton';

interface DossierDetailHeaderProps {
  dossier: Kamerstukdossier;
}

export function DossierDetailHeader({ dossier }: DossierDetailHeaderProps) {
  const timeline = buildTimeline(dossier);

  // Verzamel unieke fracties en kamerleden uit het hele dossier
  const allFracties = new Map<string, { id: string; naam: string; afkorting?: string }>();
  const allKamerleden = new Map<string, { id: string; naam: string; fractie?: string }>();

  for (const item of timeline) {
    item.fracties?.forEach((f) => allFracties.set(f.id, f));
    item.kamerleden?.forEach((k) => allKamerleden.set(k.id, k));
  }

  const latestMotie = timeline.find((i) => i.type === 'motie');
  const latestBrief = timeline.find((i) => i.type === 'kamerbrief');

  const statusColor = dossier.Afgesloten
    ? 'bg-slate-100 text-slate-500'
    : 'bg-green-100 text-green-700';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
      {/* Top rij: status + volg */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>
            {dossier.Afgesloten ? 'Afgesloten' : 'Actief'}
          </span>
          {dossier.Kamer && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {dossier.Kamer}
            </span>
          )}
          {dossier.Vergaderjaar && (
            <span className="text-xs text-slate-500">
              Vergaderjaar {dossier.Vergaderjaar ?? '—'}
            </span>
          )}
        </div>
        <FollowButton kind="dossier" refId={dossier.Id} label={dossier.Titel} />
      </div>

      {/* Titel */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 leading-snug">
          {dossier.Titel}
        </h1>
        {dossier.Citeertitel && dossier.Citeertitel !== dossier.Titel && (
          <p className="text-sm text-slate-500 mt-1">{dossier.Citeertitel}</p>
        )}
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
        <MetaCell label="Nummer" value={dossier.Nummer ? String(dossier.Nummer) : '—'} />
        <MetaCell label="Documenten" value={String(dossier.HoogsteVolgnummer ?? '—')} />
        <MetaCell label="Laatste wijziging" value={formatDate(dossier.GewijzigdOp)} />
        <MetaCell
          label="Status"
          value={dossier.Afgesloten ? 'Afgesloten' : 'In behandeling'}
        />
      </div>

      {/* Laatste items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {latestBrief && (
          <LatestItem
            label="Laatste Kamerbrief"
            title={latestBrief.title}
            date={latestBrief.date}
            href={`/kamerbrieven/${latestBrief.id}`}
          />
        )}
        {latestMotie && (
          <LatestItem
            label="Laatste motie"
            title={latestMotie.title}
            date={latestMotie.date}
            href={`/moties/${latestMotie.id}`}
            appreciatie={latestMotie.kabinetsappreciatie}
          />
        )}
      </div>

      {/* Betrokken fracties */}
      {allFracties.size > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Betrokken fracties</p>
          <RelationChipGroup
            chips={Array.from(allFracties.values()).map((f) => ({
              variant: 'fractie' as const,
              label: f.afkorting ?? f.naam,
              href: `/fracties/${f.id}`,
            }))}
            max={10}
          />
        </div>
      )}

      {/* Betrokken Kamerleden */}
      {allKamerleden.size > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Betrokken Kamerleden</p>
          <RelationChipGroup
            chips={Array.from(allKamerleden.values()).map((k) => ({
              variant: 'kamerlid' as const,
              label: k.naam,
              href: `/kamerleden/${k.id}`,
              sub: k.fractie,
            }))}
            max={8}
          />
        </div>
      )}
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function LatestItem({
  label,
  title,
  date,
  href,
  appreciatie,
}: {
  label: string;
  title: string;
  date: string;
  href: string;
  appreciatie?: string;
}) {
  return (
    <a
      href={href}
      className="block border border-slate-200 rounded-lg p-3 hover:border-slate-300 hover:bg-slate-50 transition-colors"
    >
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm text-slate-800 font-medium leading-snug line-clamp-2">{title}</p>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-xs text-slate-400">{formatDate(date)}</span>
        {appreciatie && appreciatie !== 'Niet beschikbaar bij gewijzigde moties en/of amendementen' && (
          <span className="text-xs text-slate-500">· {appreciatie}</span>
        )}
      </div>
    </a>
  );
}
