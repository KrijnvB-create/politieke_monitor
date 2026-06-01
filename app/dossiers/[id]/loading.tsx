/**
 * app/dossiers/[id]/loading.tsx
 * Skeleton loader terwijl dossier data wordt opgehaald
 */

export default function DossierLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex gap-2">
        <div className="h-4 w-16 bg-slate-200 rounded" />
        <div className="h-4 w-2 bg-slate-200 rounded" />
        <div className="h-4 w-48 bg-slate-200 rounded" />
      </div>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex justify-between">
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-slate-200 rounded-full" />
            <div className="h-6 w-24 bg-slate-200 rounded-full" />
          </div>
          <div className="h-8 w-24 bg-slate-200 rounded-lg" />
        </div>
        <div className="h-7 w-3/4 bg-slate-200 rounded" />
        <div className="h-4 w-1/2 bg-slate-200 rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-4 w-20 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 w-16 bg-slate-200 rounded-full" />
          ))}
        </div>
      </div>

      {/* Tijdlijn */}
      <div className="space-y-4">
        <div className="h-5 w-24 bg-slate-200 rounded" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200 mt-1.5" />
              <div className="w-px flex-1 bg-slate-100 mt-1" />
            </div>
            <div className="flex-1 pb-6">
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-20 bg-slate-200 rounded" />
                  <div className="h-3 w-16 bg-slate-200 rounded" />
                </div>
                <div className="h-4 w-3/4 bg-slate-200 rounded" />
                <div className="flex gap-2">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-5 w-20 bg-slate-200 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
