/**
 * app/dossiers/page.tsx
 * Dossiers overzichtspagina
 */

import Link from 'next/link';
import { getDossiers, formatDate } from '@/lib/tk';

interface PageProps {
  searchParams?: { q?: string; page?: string; status?: string };
}

export default async function DossiersPage({ searchParams }: PageProps) {
  const page = Number(searchParams?.page ?? 1);
  const query = searchParams?.q ?? '';
  const status = searchParams?.status;
  const top = 25;
  const skip = (page - 1) * top;

  const result = await getDossiers({
    top,
    skip,
    search: query || undefined,
    afgesloten: status === 'afgesloten' ? true : status === 'actief' ? false : undefined,
  });

  const dossiers = result.value;
  const total = result['@odata.count'] ?? 0;
  const totalPages = Math.ceil(total / top);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dossiers</h1>
          <p className="text-sm text-slate-500 mt-1">
            {total > 0 ? `${total.toLocaleString('nl-NL')} dossiers` : 'Laden…'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form className="flex-1" method="get">
          <input
            name="q"
            defaultValue={query}
            placeholder="Zoek op titel…"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          />
        </form>
        <div className="flex gap-2">
          {[
            { key: '', label: 'Alle' },
            { key: 'actief', label: 'Actief' },
            { key: 'afgesloten', label: 'Afgesloten' },
          ].map((s) => (
            <Link
              key={s.key}
              href={`/dossiers?status=${s.key}${query ? `&q=${query}` : ''}`}
              className={[
                'px-3 py-2 text-sm rounded-lg border font-medium transition-colors',
                (status ?? '') === s.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50',
              ].join(' ')}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {dossiers.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p>Geen dossiers gevonden</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3">Dossier</th>
                <th className="px-4 py-3 hidden sm:table-cell">Nr.</th>
                <th className="px-4 py-3 hidden md:table-cell">Status</th>
                <th className="px-4 py-3 hidden lg:table-cell">Gewijzigd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dossiers.map((d) => (
                <tr key={d.Id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dossiers/${d.Id}`}
                      className="font-medium text-slate-900 hover:text-blue-700 leading-snug"
                    >
                      {d.Titel}
                    </Link>
                    {d.Citeertitel && d.Citeertitel !== d.Titel && (
                      <p className="text-xs text-slate-400 mt-0.5">{d.Citeertitel}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-slate-500">
                    {d.Nummer ?? '—'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span
                      className={[
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        d.Afgesloten
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-green-100 text-green-700',
                      ].join(' ')}
                    >
                      {d.Afgesloten ? 'Afgesloten' : 'Actief'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-400 text-xs">
                    {formatDate(d.GewijzigdOp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginering */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Pagina {page} van {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/dossiers?page=${page - 1}${query ? `&q=${query}` : ''}${status ? `&status=${status}` : ''}`}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                ← Vorige
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/dossiers?page=${page + 1}${query ? `&q=${query}` : ''}${status ? `&status=${status}` : ''}`}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Volgende →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const metadata = {
  title: 'Dossiers — Politiekemonitor',
};
