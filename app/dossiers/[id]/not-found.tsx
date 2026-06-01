/**
 * app/dossiers/[id]/not-found.tsx
 */

import Link from 'next/link';

export default function DossierNotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
      <p className="text-4xl">📁</p>
      <h1 className="text-xl font-semibold text-slate-900">Dossier niet gevonden</h1>
      <p className="text-sm text-slate-500">
        Het dossier bestaat niet of is verwijderd uit het Gegevensmagazijn.
      </p>
      <Link
        href="/dossiers"
        className="inline-block mt-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Terug naar dossiers
      </Link>
    </div>
  );
}
