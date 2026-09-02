/**
 * app/dossiers/[id]/page.tsx
 * Dossierdetailpagina — centrale pagina van Politiekemonitor
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDossier, buildTimeline, TimelineItemType } from '@/lib/tk';
import { DossierDetailHeader } from '@/components/DossierDetailHeader';
import { TimelineCard } from '@/components/TimelineCard';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ filter?: string }>;
}

// ─── Filter tabs ─────────────────────────────────────────────────────────────

const FILTER_TABS: { key: string; label: string; types?: TimelineItemType[] }[] = [
  { key: 'alles',       label: 'Alles' },
  { key: 'kamerbrief',  label: 'Kamerbrieven',  types: ['kamerbrief'] },
  { key: 'debat',       label: 'Debatten',      types: ['debat'] },
  { key: 'motie',       label: 'Moties',        types: ['motie'] },
  { key: 'stemming',    label: 'Stemmingen',    types: ['stemming'] },
  { key: 'toezegging',  label: 'Toezeggingen',  types: ['toezegging'] },
  { key: 'verslag',     label: 'Verslagen',     types: ['verslag'] },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DossierPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const dossier = await getDossier(id);

  if (!dossier) {
    notFound();
  }

  const activeFilter = resolvedSearchParams?.filter ?? 'alles';
  const filterConfig = FILTER_TABS.find((t) => t.key === activeFilter) ?? FILTER_TABS[0];

  const allItems = buildTimeline(dossier);
  const filteredItems = filterConfig.types
    ? allItems.filter((item) => filterConfig.types!.includes(item.type))
    : allItems;

  // Telt per type voor badges
  const countByType = allItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dossiers" className="hover:text-slate-900 transition-colors">
          Dossiers
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 line-clamp-1">{dossier.Titel}</span>
      </nav>

      {/* Header */}
      <DossierDetailHeader dossier={dossier} />

      {/* Tijdlijn sectie */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Tijdlijn
            <span className="ml-2 text-sm font-normal text-slate-400">
              {allItems.length} items
            </span>
          </h2>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 flex-wrap mb-6 border-b border-slate-200 pb-0">
          {FILTER_TABS.map((tab) => {
            const count = tab.types
              ? tab.types.reduce((s, t) => s + (countByType[t] ?? 0), 0)
              : allItems.length;
            const isActive = activeFilter === tab.key;
            if (tab.key !== 'alles' && count === 0) return null;
            return (
              <Link
                key={tab.key}
                href={`?filter=${tab.key}`}
                className={[
                  'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300',
                ].join(' ')}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={[
                      'ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-500',
                    ].join(' ')}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Items */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-base">Geen {filterConfig.label.toLowerCase()} gevonden</p>
            <p className="text-sm mt-1">Probeer een ander filter</p>
          </div>
        ) : (
          <div>
            {filteredItems.map((item) => (
              <TimelineCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const dossier = await getDossier(id);
  if (!dossier) return { title: 'Dossier niet gevonden' };
  return {
    title: `${dossier.Titel} — Politiekemonitor`,
    description: dossier.Citeertitel ?? dossier.Titel,
  };
}
