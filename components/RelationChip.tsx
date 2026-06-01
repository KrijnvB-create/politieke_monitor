/**
 * components/RelationChip.tsx
 * Doorklikbare relatiechip voor alle TK-entiteiten
 */

import Link from 'next/link';

type ChipVariant =
  | 'kamerlid'
  | 'fractie'
  | 'commissie'
  | 'bewindspersoon'
  | 'dossier'
  | 'debat'
  | 'motie'
  | 'kamerbrief'
  | 'stemming'
  | 'zaak';

interface RelationChipProps {
  variant: ChipVariant;
  label: string;
  href?: string;
  sub?: string; // bijv. fractienaam bij een Kamerlid
  size?: 'sm' | 'md';
}

const VARIANT_CONFIG: Record<
  ChipVariant,
  { color: string; icon: string; prefix: string }
> = {
  kamerlid:      { color: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100',      icon: '👤', prefix: '/kamerleden/' },
  fractie:       { color: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100', icon: '🏛', prefix: '/fracties/' },
  commissie:     { color: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100', icon: '📋', prefix: '/commissies/' },
  bewindspersoon:{ color: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',  icon: '🏛', prefix: '/bewindspersonen/' },
  dossier:       { color: 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200',  icon: '📁', prefix: '/dossiers/' },
  debat:         { color: 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100', icon: '💬', prefix: '/debatten/' },
  motie:         { color: 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100',       icon: '📝', prefix: '/moties/' },
  kamerbrief:    { color: 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100',       icon: '✉️', prefix: '/kamerbrieven/' },
  stemming:      { color: 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100', icon: '🗳', prefix: '/stemmingen/' },
  zaak:          { color: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',   icon: '📌', prefix: '/zaken/' },
};

export function RelationChip({ variant, label, href, sub, size = 'sm' }: RelationChipProps) {
  const cfg = VARIANT_CONFIG[variant];
  const classes = [
    'inline-flex items-center gap-1 border rounded-full font-medium transition-colors whitespace-nowrap',
    cfg.color,
    size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1',
    href ? 'cursor-pointer' : 'cursor-default',
  ].join(' ');

  const content = (
    <>
      <span className="leading-none">{cfg.icon}</span>
      <span>{label}</span>
      {sub && <span className="opacity-60">· {sub}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return <span className={classes}>{content}</span>;
}

/** Groep van chips, bijv. alle betrokken fracties */
export function RelationChipGroup({
  chips,
  max = 5,
}: {
  chips: RelationChipProps[];
  max?: number;
}) {
  const visible = chips.slice(0, max);
  const rest = chips.length - max;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((chip, i) => (
        <RelationChip key={i} {...chip} />
      ))}
      {rest > 0 && (
        <span className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
          +{rest}
        </span>
      )}
    </div>
  );
}
