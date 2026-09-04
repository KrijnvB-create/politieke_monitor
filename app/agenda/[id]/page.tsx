import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NotFoundDetail } from "@/components/detail-panel";
import { SaveButton } from "@/components/save-button";
import { RelationChipGroup } from "@/components/RelationChip";
import { getActiviteitDb, persoonNaamDb } from "@/lib/db";
import type { DbZaak } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/tk";

type AgendaDetailPageProps = {
  params: Promise<{ id: string }>;
};

function zaakHref(z: DbZaak) {
  return `/dossiers/${z.kamerstukdossier_id ?? z.id}`;
}

export default async function AgendaDetailPage({ params }: AgendaDetailPageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const detail = await getActiviteitDb(decodedId);

  if (!detail) {
    return <NotFoundDetail title="Agenda-item niet gevonden" backHref="/agenda" backLabel="Terug naar agenda" />;
  }

  const { activiteit, voortouwcommissie, moties, overigeZaken, deelnemers } = detail;
  const title = activiteit.onderwerp || activiteit.soort || "Agendapunt";

  const deelnemerChips = deelnemers.map((d) => {
    const sub = [d.relatie, d.actor_fractie ?? d.fractie?.afkorting].filter(Boolean).join(" · ");
    if (d.persoon) {
      return {
        variant: "kamerlid" as const,
        label: persoonNaamDb(d.persoon) || d.actor_naam || "Onbekend",
        href: `/kamerleden/${d.persoon.id}`,
        sub: sub || undefined,
      };
    }
    return {
      variant: "bewindspersoon" as const,
      label: d.actor_naam ?? d.functie ?? "Onbekend",
      sub: sub || undefined,
    };
  });

  return (
    <main className="page-shell detail-page">
      <Link className="text-link back-link" href="/agenda">
        <ArrowLeft size={16} aria-hidden="true" />
        Terug naar agenda
      </Link>

      <section className="detail-panel">
        <div>
          <p className="eyebrow">{activiteit.soort ?? "Activiteit"}</p>
          <h1>{title}</h1>
          <p>
            {formatDate(activiteit.aanvangstijd ?? undefined)}
            {activiteit.aanvangstijd ? ` · ${formatTime(activiteit.aanvangstijd)}` : ""}
            {activiteit.locatie ? ` · ${activiteit.locatie}` : ""}
          </p>
        </div>
        <div className="detail-actions">
          <SaveButton kind="activiteit" refId={activiteit.id} label={title} meta={{ ...activiteit }} />
        </div>
      </section>

      {voortouwcommissie ? (
        <section className="quiet-panel detail-meta">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Voortouw</p>
              <h2>{voortouwcommissie.naam_nl ?? voortouwcommissie.afkorting ?? "Commissie"}</h2>
            </div>
          </div>
          <RelationChipGroup
            chips={[
              {
                variant: "commissie",
                label: voortouwcommissie.afkorting ?? voortouwcommissie.naam_nl ?? "Commissie",
                href: `/commissies/${voortouwcommissie.id}`,
              },
            ]}
          />
        </section>
      ) : null}

      <section className="quiet-panel detail-meta">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Moties</p>
            <h2>Moties in dit debat{moties.length ? ` (${moties.length})` : ""}</h2>
          </div>
        </div>
        {moties.length === 0 ? (
          <p>Geen moties gekoppeld aan dit agendapunt.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {moties.map((z) => (
              <li key={z.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                <div className="flex items-center justify-between gap-3">
                  <Link href={zaakHref(z)} className="text-sm font-medium text-slate-900 hover:text-blue-700">
                    {z.titel ?? z.onderwerp ?? "Motie"}
                  </Link>
                  {z.huidige_behandelstatus ?? z.status ? (
                    <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded whitespace-nowrap">
                      {z.huidige_behandelstatus ?? z.status}
                    </span>
                  ) : null}
                </div>
                {z.onderwerp && z.onderwerp !== z.titel ? (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{z.onderwerp}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="quiet-panel detail-meta">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Deelnemers</p>
            <h2>Deelnemende Kamerleden{deelnemerChips.length ? ` (${deelnemerChips.length})` : ""}</h2>
          </div>
        </div>
        {deelnemerChips.length === 0 ? (
          <p>Geen deelnemerslijst bekend voor dit agendapunt.</p>
        ) : (
          <RelationChipGroup chips={deelnemerChips} max={40} />
        )}
      </section>

      {overigeZaken.length > 0 ? (
        <section className="quiet-panel detail-meta">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Overige zaken</p>
              <h2>Overige zaken bij dit agendapunt ({overigeZaken.length})</h2>
            </div>
          </div>
          <ul className="flex flex-col gap-2">
            {overigeZaken.map((z) => (
              <li key={z.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                <div className="flex items-center justify-between gap-3">
                  <Link href={zaakHref(z)} className="text-sm font-medium text-slate-900 hover:text-blue-700">
                    {z.titel ?? z.onderwerp ?? z.soort ?? "Zaak"}
                  </Link>
                  <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded whitespace-nowrap">
                    {z.soort ?? ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
