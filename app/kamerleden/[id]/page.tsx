import Link from "next/link";
import { NotFoundDetail } from "@/components/detail-panel";
import { SaveButton } from "@/components/save-button";
import { KamerlidExplorer, type KamerlidTimelineItem } from "@/components/KamerlidExplorer";
import {
  getPersoonDb,
  getPersoonStatsDb,
  getCommissiesVanPersoonDb,
  getActiviteitenVanPersoonDb,
  getMotiesVanPersoonDb,
  getVragenVanPersoonDb,
  getAmendementenVanPersoonDb,
  getToezeggingenVanPersoonDb,
  persoonNaamDb,
  type DbToezegging,
} from "@/lib/db";
import { personResourceUrl, formatDate } from "@/lib/tk";
import { factionColor } from "@/lib/factions";

type KamerlidDetailPageProps = {
  params: Promise<{ id: string }>;
};

function initialsOf(naam: string) {
  const parts = naam.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Vervaldatum van een toezegging naar leesbare status/deadline-tekst, zelfde
 * logica als de weergave op de Agenda-detailpagina (Openstaand/Afgedaan/te laat). */
function toezeggingDeadline(t: DbToezegging): { label: string; late: boolean } {
  if (t.status === "Afgedaan") return { label: "Afgedaan", late: false };
  if (!t.datum_nakoming) return { label: t.status ?? "Openstaand", late: false };

  const vandaag = new Date().toISOString().slice(0, 10);
  if (t.datum_nakoming >= vandaag) {
    return { label: `Voor ${formatDate(t.datum_nakoming)}`, late: false };
  }

  const dagen = Math.round((Date.now() - new Date(t.datum_nakoming).getTime()) / 86400000);
  if (dagen < 7) return { label: `${dagen} ${dagen === 1 ? "dag" : "dagen"} te laat`, late: true };
  const weken = Math.round(dagen / 7);
  return { label: `${weken} ${weken === 1 ? "week" : "weken"} te laat`, late: true };
}

export default async function KamerlidDetailPage({ params }: KamerlidDetailPageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const persoon = await getPersoonDb(decodedId);

  if (!persoon) {
    return <NotFoundDetail title="Kamerlid niet gevonden" backHref="/kamerleden" backLabel="Terug naar Kamerleden" />;
  }

  const [stats, commissies, activiteiten, moties, vragen, amendementen, toezeggingen] = await Promise.all([
    getPersoonStatsDb(decodedId),
    getCommissiesVanPersoonDb(decodedId),
    getActiviteitenVanPersoonDb(decodedId, { limit: 80 }),
    getMotiesVanPersoonDb(decodedId, { limit: 150 }),
    getVragenVanPersoonDb(decodedId, { limit: 150 }),
    getAmendementenVanPersoonDb(decodedId, { limit: 150 }),
    getToezeggingenVanPersoonDb(decodedId, { limit: 100 }),
  ]);

  const naam = persoonNaamDb(persoon) || persoon.achternaam || "Onbekend Kamerlid";
  const fractie = persoon.fractie;
  const photo = personResourceUrl(decodedId);
  const nowIso = new Date().toISOString();

  const items: KamerlidTimelineItem[] = [];

  for (const a of activiteiten) {
    const isFuture = !!a.aanvangstijd && a.aanvangstijd >= nowIso;
    items.push({
      id: a.id,
      kind: isFuture ? "agenda" : "debat",
      date: a.aanvangstijd,
      title: a.onderwerp ?? a.soort ?? "Activiteit",
      sub: a.functie ?? undefined,
      href: `/agenda/${a.id}`,
      meta: a.locatie ?? undefined,
    });
  }

  for (const m of moties) {
    const result = m.uitslag?.result;
    items.push({
      id: m.id,
      kind: "motie",
      date: m.gestart_op,
      title: m.titel ?? m.onderwerp ?? "Motie",
      href: m.dossier ? `/dossiers/${m.dossier.id}` : m.kamerstukdossier_id ? `/dossiers/${m.kamerstukdossier_id}` : undefined,
      statusLabel: result && result !== "Onbekend" ? result : undefined,
      statusTone: result === "Aangenomen" ? "positive" : result === "Verworpen" ? "negative" : "neutral",
      voorStemmen: m.uitslag ? m.uitslag.voor : undefined,
    });
  }

  for (const a of amendementen) {
    const result = a.uitslag?.result;
    items.push({
      id: a.id,
      kind: "amendement",
      date: a.gestart_op,
      title: a.titel ?? a.onderwerp ?? "Amendement",
      href: a.dossier ? `/dossiers/${a.dossier.id}` : a.kamerstukdossier_id ? `/dossiers/${a.kamerstukdossier_id}` : undefined,
      statusLabel: result && result !== "Onbekend" ? result : undefined,
      statusTone: result === "Aangenomen" ? "positive" : result === "Verworpen" ? "negative" : "neutral",
      voorStemmen: a.uitslag ? a.uitslag.voor : undefined,
    });
  }

  for (const v of vragen) {
    items.push({
      id: v.id,
      kind: "vraag",
      date: v.gestart_op,
      title: v.titel ?? v.onderwerp ?? "Vraag",
      href: v.dossier ? `/dossiers/${v.dossier.id}` : v.kamerstukdossier_id ? `/dossiers/${v.kamerstukdossier_id}` : undefined,
    });
  }

  for (const t of toezeggingen) {
    const deadline = toezeggingDeadline(t);
    items.push({
      id: t.id,
      kind: "toezegging",
      date: t.aanmaakdatum,
      title: t.tekst ? (t.tekst.length > 140 ? `${t.tekst.slice(0, 139)}...` : t.tekst) : "Toezegging",
      sub: [t.bewindspersoon_naam, t.ministerie].filter(Boolean).join(" - ") || undefined,
      deadlineLabel: deadline.label,
      deadlineLate: deadline.late,
    });
  }

  const commissieLabel =
    commissies.length > 0
      ? commissies
          .slice(0, 2)
          .map((c) => c.naam_nl ?? c.afkorting ?? "Commissie")
          .join(", ") + (commissies.length > 2 ? ` +${commissies.length - 2}` : "")
      : null;

  return (
    <main>
      <section className="debat-hero">
        <div className="debat-hero-inner">
          <div className="debat-breadcrumb">
            <Link href="/kamerleden">Kamerleden</Link>
            <span>/</span>
            <span>{naam}</span>
          </div>

          <div className="debat-hero-head">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 22, minWidth: 0, flex: "1 1 480px" }}>
              <span className="kamerlid-hero-avatar">
                {photo ? <img src={photo} alt="" loading="lazy" /> : null}
                <span>{initialsOf(naam)}</span>
              </span>
              <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
                <h1>{naam}</h1>
                {fractie ? (
                  <span className="kamerlid-hero-fractie">
                    <i style={{ background: factionColor(fractie.afkorting ?? fractie.naam_nl) }} />
                    {fractie.naam_nl ?? fractie.afkorting}
                    {persoon.functie ? (
                      <>
                        <span style={{ width: 1, height: 14, background: "rgba(246,246,243,.24)" }} />
                        {persoon.functie}
                      </>
                    ) : null}
                  </span>
                ) : persoon.functie ? (
                  <span className="kamerlid-hero-fractie">{persoon.functie}</span>
                ) : null}
                <div className="debat-hero-meta">
                  {commissieLabel ? <span>{commissieLabel}</span> : null}
                  {stats?.lidSinds ? <span>Lid sinds {formatDate(stats.lidSinds)}</span> : null}
                </div>
              </div>
            </div>
            <div className="debat-hero-actions">
              <SaveButton kind="kamerlid" refId={decodedId} label={naam} meta={{ ...persoon }} />
            </div>
          </div>

          {stats ? (
            <div className="debat-hero-stats">
              <div>
                <strong>{stats.motieTotaal}</strong>
                <span>Moties</span>
                {stats.motieTotaal > 0 ? <small>{stats.motieAangenomen} aangenomen</small> : null}
              </div>
              <div>
                <strong>{stats.vraagTotaal}</strong>
                <span>Vragen</span>
              </div>
              <div>
                <strong>{stats.toezeggingTotaal}</strong>
                <span>Toezeggingen</span>
                {stats.toezeggingTotaal > 0 ? (
                  <small>
                    {stats.toezeggingOpen} open{stats.toezeggingLaat > 0 ? `, ${stats.toezeggingLaat} te laat` : ""}
                  </small>
                ) : null}
              </div>
              <div>
                <strong>{stats.debatTotaal}</strong>
                <span>Debatten</span>
              </div>
              <div>
                <strong>{stats.amendementTotaal}</strong>
                <span>Amendementen</span>
                {stats.amendementTotaal > 0 ? <small>{stats.amendementAangenomen} aangenomen</small> : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {stats ? (
        <KamerlidExplorer persoonId={decodedId} items={items} stats={stats} />
      ) : (
        <div className="debat-body">
          <div className="empty-tab-card">
            <strong>Geen gegevens beschikbaar</strong>
            <p>Er kon geen overzicht worden opgebouwd voor dit Kamerlid.</p>
          </div>
        </div>
      )}
    </main>
  );
}

export const metadata = {
  title: "Kamerlid - Politiekemonitor",
};
