import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { NotFoundDetail } from "@/components/detail-panel";
import { SaveButton } from "@/components/save-button";
import { RelationChipGroup } from "@/components/RelationChip";
import {
  getPersoonDb,
  getZakenVanPersoonDb,
  getActiviteitenVanPersoonDb,
  getCommissiesVanPersoonDb,
  persoonNaamDb,
} from "@/lib/db";
import { personResourceUrl, formatDate } from "@/lib/tk";

type KamerlidDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function KamerlidDetailPage({ params }: KamerlidDetailPageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const persoon = await getPersoonDb(decodedId);

  if (!persoon) {
    return <NotFoundDetail title="Kamerlid niet gevonden" backHref="/kamerleden" backLabel="Terug naar Kamerleden" />;
  }

  const [zaken, activiteiten, commissies] = await Promise.all([
    getZakenVanPersoonDb(decodedId, { limit: 8 }),
    getActiviteitenVanPersoonDb(decodedId, { limit: 8 }),
    getCommissiesVanPersoonDb(decodedId),
  ]);

  const naam = persoonNaamDb(persoon) || persoon.achternaam || "Onbekend Kamerlid";
  const fractie = persoon.fractie;

  const commissieChips = commissies.map((c) => ({
    variant: "commissie" as const,
    label: c.afkorting ?? c.naam_nl ?? "Commissie",
    href: `/commissies/${c.id}`,
    sub: c.afkorting && c.naam_nl ? c.naam_nl : undefined,
  }));

  return (
    <main className="page-shell detail-page">
      <Link className="text-link back-link" href="/kamerleden">
        <ArrowLeft size={16} aria-hidden="true" />
        Terug naar Kamerleden
      </Link>

      <section className="detail-panel">
        <div>
          <p className="eyebrow">{persoon.functie ?? "Kamerlid"}</p>
          <h1>{naam}</h1>
          {fractie ? (
            <RelationChipGroup
              chips={[
                {
                  variant: "fractie",
                  label: fractie.naam_nl ?? fractie.afkorting ?? "Fractie",
                  href: `/fracties/${fractie.id}`,
                  sub: fractie.afkorting ?? undefined,
                },
              ]}
            />
          ) : (
            <p>Geen actuele fractie bekend.</p>
          )}
        </div>

        <div className="detail-actions">
          <a className="secondary-button" href={personResourceUrl(decodedId)} target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden="true" />
            Open foto
          </a>
          <SaveButton kind="kamerlid" refId={decodedId} label={naam} meta={{ ...persoon }} />
        </div>
      </section>

      <section className="quiet-panel detail-meta">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Commissies</p>
            <h2>Commissielidmaatschappen{commissieChips.length ? ` (${commissieChips.length})` : ""}</h2>
          </div>
        </div>
        {commissieChips.length === 0 ? (
          <p>Geen actuele commissielidmaatschappen bekend.</p>
        ) : (
          <RelationChipGroup chips={commissieChips} max={20} />
        )}
      </section>

      <section className="quiet-panel detail-meta">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Moties &amp; zaken</p>
            <h2>Recente moties en zaken{zaken.length ? ` (${zaken.length})` : ""}</h2>
          </div>
        </div>
        {zaken.length === 0 ? (
          <p>Geen recente moties of zaken gevonden.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {zaken.map((z) => (
              <li key={z.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/dossiers/${z.kamerstukdossier_id ?? z.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-700">
                    {z.titel ?? z.onderwerp ?? z.soort ?? "Zaak"}
                  </Link>
                  <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded whitespace-nowrap">
                    {z.soort ?? ""}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{formatDate(z.gestart_op ?? undefined)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="quiet-panel detail-meta">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Debatten</p>
            <h2>Recente debatten{activiteiten.length ? ` (${activiteiten.length})` : ""}</h2>
          </div>
        </div>
        {activiteiten.length === 0 ? (
          <p>Geen recente debatten gevonden.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activiteiten.map((a) => (
              <li key={a.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/agenda/${a.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-700">
                    {a.onderwerp ?? a.soort ?? "Activiteit"}
                  </Link>
                  <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded whitespace-nowrap">
                    {formatDate(a.aanvangstijd ?? undefined)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
