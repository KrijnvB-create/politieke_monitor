import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  Folder,
  Gavel,
  Handshake,
  Info,
  MapPin,
  Mic2,
  Sparkles,
  User,
  UserCircle2,
  Users
} from "lucide-react";
import { NotFoundDetail } from "@/components/detail-panel";
import { SaveButton } from "@/components/save-button";
import {
  getActiviteitDb,
  getGerelateerdeActiviteitenDb,
  getSamenvattingVoorActiviteitDb,
  getToezeggingenVoorActiviteitDb,
  persoonNaamDb
} from "@/lib/db";
import type { DbActiviteit, DbZaak } from "@/lib/db";
import { factionColor } from "@/lib/factions";
import { formatDate, formatTime } from "@/lib/tk";

type AgendaDetailPageProps = {
  params: Promise<{ id: string }>;
};

function zaakHref(z: DbZaak) {
  return `/dossiers/${z.kamerstukdossier_id ?? z.id}`;
}

function initials(naam: string) {
  const parts = naam.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function formatDuur(aanvang: string | null, eind: string | null): string | null {
  if (!aanvang || !eind) return null;
  const ms = new Date(eind).getTime() - new Date(aanvang).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minuten = Math.round(ms / 60000);
  const uren = Math.floor(minuten / 60);
  const rest = minuten % 60;
  if (uren === 0) return `${rest} min`;
  if (rest === 0) return `${uren} uur`;
  return `${uren}u ${rest}m`;
}

function EmptyTab({ text }: { text: string }) {
  return (
    <div className="empty-tab-card">
      <Info size={26} aria-hidden="true" color="var(--tl-ink-500)" />
      <strong>Niets gevonden</strong>
      <p>{text}</p>
    </div>
  );
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

  const dossierId =
    moties.find((m) => m.kamerstukdossier_id)?.kamerstukdossier_id ??
    overigeZaken.find((z) => z.kamerstukdossier_id)?.kamerstukdossier_id ??
    null;

  const [samenvatting, toezeggingen, eerdereDebatten] = await Promise.all([
    getSamenvattingVoorActiviteitDb(activiteit.id),
    getToezeggingenVoorActiviteitDb(activiteit.nummer),
    dossierId ? getGerelateerdeActiviteitenDb(dossierId, activiteit.id) : Promise.resolve([] as DbActiviteit[])
  ]);

  const sprekers = deelnemers.filter((d) => d.persoon);
  const bewindspersonen = deelnemers.filter((d) => !d.persoon);
  const aangenomenMoties = moties.filter((m) => (m.uitslag?.result ?? "").toLowerCase().includes("aangenomen")).length;
  const openToezeggingen = toezeggingen.filter((t) => t.status !== "Afgedaan").length;
  const duur = formatDuur(activiteit.aanvangstijd, activiteit.eindtijd);

  const heroStats: { key: string; value: string | number; label: string; sub?: string }[] = [
    ...(duur ? [{ key: "duur", value: duur, label: "Duur" }] : []),
    { key: "deelnemers", value: sprekers.length, label: "Deelnemers" },
    { key: "stukken", value: overigeZaken.length, label: "Stukken" },
    {
      key: "moties",
      value: moties.length,
      label: "Moties",
      sub: moties.length ? `${aangenomenMoties} aangenomen` : undefined
    },
    {
      key: "toezeggingen",
      value: toezeggingen.length,
      label: "Toezeggingen",
      sub: toezeggingen.length ? `${openToezeggingen} nog open` : undefined
    }
  ];

  return (
    <main>
      <section className="debat-hero">
        <div className="debat-hero-inner">
          <div className="debat-breadcrumb">
            <Link href="/agenda">Agenda</Link>
            <span>/</span>
            <span>{formatDate(activiteit.aanvangstijd ?? undefined)}</span>
          </div>

          <div className="debat-hero-head">
            <div>
              <div className="debat-hero-tags">
                <p className="eyebrow">{activiteit.soort ?? "Activiteit"}</p>
                {activiteit.status ? <span className="debat-status-tag">{activiteit.status}</span> : null}
              </div>
              <h1>{title}</h1>
              <div className="debat-hero-meta">
                {activiteit.aanvangstijd ? (
                  <span>
                    <CalendarDays size={14} aria-hidden="true" />
                    {formatDate(activiteit.aanvangstijd)}, {formatTime(activiteit.aanvangstijd)}
                    {activiteit.eindtijd ? ` tot ${formatTime(activiteit.eindtijd)}` : ""}
                  </span>
                ) : null}
                {voortouwcommissie ? (
                  <span>
                    <Users size={14} aria-hidden="true" />
                    {voortouwcommissie.naam_nl ?? voortouwcommissie.afkorting}
                  </span>
                ) : null}
                {activiteit.locatie ? (
                  <span>
                    <MapPin size={14} aria-hidden="true" />
                    {activiteit.locatie}
                  </span>
                ) : null}
                {dossierId ? (
                  <Link href={`/dossiers/${dossierId}`}>
                    <Folder size={14} aria-hidden="true" />
                    Dossier {dossierId}
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="debat-hero-actions">
              <SaveButton kind="activiteit" refId={activiteit.id} label={title} meta={{ ...activiteit }} />
            </div>
          </div>

          <div className="debat-hero-stats">
            {heroStats.map((s) => (
              <div key={s.key}>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
                {s.sub ? <small>{s.sub}</small> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="debat-body">
        <div style={{ minWidth: 0 }}>
          <Link className="text-link back-link" href="/agenda">
            <ArrowLeft size={16} aria-hidden="true" />
            Terug naar agenda
          </Link>

          {samenvatting?.korte_samenvatting ? (
            <div className="ai-card" style={{ marginTop: 20 }}>
              <div className="ai-card-head">
                <span className="ai-card-kicker">
                  <Sparkles size={18} aria-hidden="true" />
                  Samenvatting door AI
                </span>
                {samenvatting.gegenereerd_op ? (
                  <span className="ai-card-meta">
                    Gegenereerd {formatDate(samenvatting.gegenereerd_op)} uit het woordelijk verslag
                  </span>
                ) : null}
              </div>

              <p className="ai-card-lead">{samenvatting.korte_samenvatting}</p>

              {samenvatting.onderwerpen && samenvatting.onderwerpen.length > 0 ? (
                <div className="ai-card-topics">
                  {samenvatting.onderwerpen.map((o) => (
                    <span key={o}>{o}</span>
                  ))}
                </div>
              ) : null}

              {samenvatting.uitgebreide_analyse ? (
                <details>
                  <summary>Uitgebreide analyse</summary>
                  <p className="ai-card-analyse">{samenvatting.uitgebreide_analyse}</p>
                </details>
              ) : null}

              <p className="ai-card-footer">
                Automatisch samengevat uit het woordelijk verslag. Controleer bij het originele verslag voordat je
                citeert.
              </p>
            </div>
          ) : (
            <div className="ai-card-empty" style={{ marginTop: 20 }}>
              Nog geen AI-samenvatting beschikbaar voor dit debat.
            </div>
          )}

          <div className="tab-shell" style={{ marginTop: 8 }}>
            <input type="radio" name="debattab" id="tab-sprekers" defaultChecked />
            <input type="radio" name="debattab" id="tab-stukken" />
            <input type="radio" name="debattab" id="tab-moties" />
            <input type="radio" name="debattab" id="tab-toezeggingen" />

            <div className="tab-bar">
              <label htmlFor="tab-sprekers">
                <Mic2 size={15} aria-hidden="true" />
                Sprekers <span>{sprekers.length}</span>
              </label>
              <label htmlFor="tab-stukken">
                <FileText size={15} aria-hidden="true" />
                Stukken <span>{overigeZaken.length}</span>
              </label>
              <label htmlFor="tab-moties">
                <Gavel size={15} aria-hidden="true" />
                Moties <span>{moties.length}</span>
              </label>
              <label htmlFor="tab-toezeggingen">
                <Handshake size={15} aria-hidden="true" />
                Toezeggingen <span>{toezeggingen.length}</span>
              </label>
            </div>

            <div className="tab-panels">
              <div id="panel-sprekers" className="tab-panel">
                <div className="section-divider">
                  <strong>
                    <Mic2 size={18} aria-hidden="true" color="#9441e9" />
                    Sprekers
                  </strong>
                  <hr />
                  <em>{sprekers.length} deelnemers</em>
                </div>
                {sprekers.length === 0 ? (
                  <EmptyTab text="Geen deelnemerslijst bekend voor dit agendapunt." />
                ) : (
                  <div className="item-card-list">
                    {sprekers.map((d, i) => {
                      const naam = d.persoon ? persoonNaamDb(d.persoon) || (d.actor_naam ?? "Onbekend") : (d.actor_naam ?? "Onbekend");
                      const fractie = d.actor_fractie ?? d.fractie?.afkorting ?? null;
                      return (
                        <div className="item-card" key={d.persoon?.id ?? `${naam}-${i}`}>
                          <span
                            className="item-card-avatar"
                            style={{ boxShadow: `inset 0 0 0 2px ${factionColor(fractie)}` }}
                          >
                            {initials(naam)}
                          </span>
                          <div className="item-card-body">
                            {d.persoon ? (
                              <Link href={`/kamerleden/${d.persoon.id}`}>{naam}</Link>
                            ) : (
                              <span
                                style={{
                                  fontFamily: "var(--font-display)",
                                  fontWeight: 600,
                                  fontSize: 16,
                                  color: "var(--tl-deep-purple)"
                                }}
                              >
                                {naam}
                              </span>
                            )}
                            <div className="item-card-tags">
                              {fractie ? <span className="item-card-tag">{fractie}</span> : null}
                              {d.relatie ? (
                                <span className="item-card-meta">
                                  <User size={13} aria-hidden="true" />
                                  {d.relatie}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div id="panel-stukken" className="tab-panel">
                <div className="section-divider">
                  <strong>
                    <FileText size={18} aria-hidden="true" color="#512986" />
                    Stukken
                  </strong>
                  <hr />
                  <em>{overigeZaken.length} stukken</em>
                </div>
                {overigeZaken.length === 0 ? (
                  <EmptyTab text="Geen andere stukken gekoppeld aan dit agendapunt." />
                ) : (
                  <div className="item-card-list">
                    {overigeZaken.map((z) => (
                      <div className="item-card" key={z.id}>
                        <span className="item-card-icon">
                          <FileText size={19} aria-hidden="true" />
                        </span>
                        <div className="item-card-body">
                          <Link href={zaakHref(z)}>{z.titel ?? z.onderwerp ?? z.soort ?? "Stuk"}</Link>
                          {z.onderwerp && z.onderwerp !== z.titel ? <p>{z.onderwerp}</p> : null}
                          <div className="item-card-tags">
                            {z.soort ? <span className="item-card-tag">{z.soort}</span> : null}
                            {z.status ? <span className="item-card-meta">{z.status}</span> : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div id="panel-moties" className="tab-panel">
                <div className="section-divider">
                  <strong>
                    <Gavel size={18} aria-hidden="true" color="#23154e" />
                    Moties
                  </strong>
                  <hr />
                  <em>{moties.length} moties</em>
                </div>
                {moties.length === 0 ? (
                  <EmptyTab text="Geen moties gekoppeld aan dit agendapunt." />
                ) : (
                  <div className="item-card-list">
                    {moties.map((z) => {
                      const result = z.uitslag?.result ?? null;
                      const lower = (result ?? "").toLowerCase();
                      const isAangenomen = lower.includes("aangenomen");
                      const isVerworpen = lower.includes("verworpen");
                      const totaal = z.uitslag ? z.uitslag.voor + z.uitslag.tegen : 0;
                      const voorPct = z.uitslag && totaal > 0 ? Math.round((z.uitslag.voor / totaal) * 100) : null;
                      return (
                        <div className="item-card" key={z.id}>
                          <span className="item-card-icon">
                            <Gavel size={19} aria-hidden="true" />
                          </span>
                          <div className="item-card-body">
                            <Link href={zaakHref(z)}>{z.titel ?? z.onderwerp ?? "Motie"}</Link>
                            {z.onderwerp && z.onderwerp !== z.titel ? <p>{z.onderwerp}</p> : null}
                            <div className="item-card-tags">
                              <span
                                className={
                                  "item-card-tag" +
                                  (isAangenomen ? " positive" : isVerworpen ? " negative" : "")
                                }
                              >
                                {result ?? "Nog niet gestemd"}
                              </span>
                              {z.kabinetsappreciatie ? (
                                <span className="item-card-meta">Kabinet: {z.kabinetsappreciatie}</span>
                              ) : null}
                            </div>
                            {z.uitslag && totaal > 0 ? (
                              <div className="item-vote-bar">
                                <div className="item-vote-bar-row">
                                  <strong>{z.uitslag.voor} voor</strong>
                                  <span>{z.uitslag.tegen} tegen</span>
                                </div>
                                <div className="item-vote-bar-track">
                                  <span style={{ width: `${voorPct}%` }} />
                                </div>
                              </div>
                            ) : null}
                          </div>
                          {voorPct !== null ? (
                            <div className="item-card-aside">
                              <strong>{voorPct}%</strong>
                              <span>voor</span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div id="panel-toezeggingen" className="tab-panel">
                <div className="section-divider">
                  <strong>
                    <Handshake size={18} aria-hidden="true" color="#fd5924" />
                    Toezeggingen
                  </strong>
                  <hr />
                  <em>{toezeggingen.length} toezeggingen</em>
                </div>
                {toezeggingen.length === 0 ? (
                  <EmptyTab text="Geen toezeggingen geregistreerd bij dit agendapunt." />
                ) : (
                  <div className="item-card-list">
                    {toezeggingen.map((t) => {
                      const done = t.status === "Afgedaan";
                      const wie = [t.bewindspersoon_naam, t.ministerie].filter(Boolean).join(" - ");
                      return (
                        <div className="item-card" key={t.id}>
                          <span className="item-card-icon">
                            <Handshake size={19} aria-hidden="true" />
                          </span>
                          <div className="item-card-body">
                            <span
                              style={{
                                fontFamily: "var(--font-display)",
                                fontWeight: 600,
                                fontSize: 16,
                                color: "var(--tl-deep-purple)"
                              }}
                            >
                              {t.tekst ?? "Toezegging"}
                            </span>
                            <div className="item-card-tags">
                              <span className={"item-card-tag" + (done ? " positive" : "")}>
                                {t.status ?? "Onbekend"}
                              </span>
                              {wie ? (
                                <span className="item-card-meta">
                                  <UserCircle2 size={13} aria-hidden="true" />
                                  {wie}
                                </span>
                              ) : null}
                              {t.datum_nakoming ? <span className="item-card-meta">{t.datum_nakoming}</span> : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="debat-sidebar">
          {bewindspersonen.length > 0 ? (
            <div className="sidebar-block">
              <span>Bewindspersonen</span>
              <div className="sidebar-list">
                {bewindspersonen.map((d, i) => (
                  <div className="sidebar-row" key={i}>
                    <i>{initials(d.actor_naam ?? "?")}</i>
                    <div>
                      <strong>{d.actor_naam ?? "Onbekend"}</strong>
                      <span>{d.functie ?? d.relatie ?? ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {eerdereDebatten.length > 0 ? (
            <div className="sidebar-block">
              <span>Eerdere debatten in dit dossier</span>
              <div className="sidebar-list">
                {eerdereDebatten.map((a) => (
                  <Link className="sidebar-row stacked" href={`/agenda/${a.id}`} key={a.id}>
                    <strong>{a.onderwerp || a.soort || "Activiteit"}</strong>
                    <span>{formatDate(a.aanvangstijd ?? undefined)}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
