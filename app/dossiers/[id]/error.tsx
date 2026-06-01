/**
 * app/dossiers/[id]/error.tsx
 * Nette foutpagina als de TK API faalt
 */

'use client';

import Link from 'next/link';

export default function DossierError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
      <p className="text-4xl">⚠️</p>
      <h1 className="text-xl font-semibold text-slate-900">Fout bij laden</h1>
      <p className="text-sm text-slate-500">
        De Tweede Kamer API is tijdelijk niet bereikbaar. Probeer het opnieuw.
      </p>
      <p className="text-xs text-slate-400 font-mono bg-slate-50 border border-slate-200 rounded p-2">
        {error.message}
      </p>
      <div className="flex gap-3 justify-center mt-2">
        <button
          onClick={reset}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Opnieuw proberen
        </button>
        <Link
          href="/dossiers"
          className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Terug naar dossiers
        </Link>
      </div>
    </div>
  );
}
