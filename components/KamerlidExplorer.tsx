"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  Gavel,
  HelpCircle,
  Handshake,
  Mic,
  Search,
  SquareStack,
  X,
} from "lucide-react";
import type { PersoonStats } from "@/lib/db";

export type KamerlidItemKind = "agenda" | "debat" | "motie" | "vraag" | "amendement" | "toezegging";

export interface KamerlidTimelineItem {
  id: string;
  kind: KamerlidItemKind;
  date: string | null;
  title: string;
  sub?: string;
  href?: string;
  statusLabel?: string;
  statusTone?: "positive" | "negative" | "neutral";
  meta?: string;
  dossierLabel?: string;
  dossierHref?: string;
  voorStemmen?: number;
  deadlineLabel?: string;
  deadlineLate?: boolean;
}

const KINDS: Record<KamerlidItemKind, { label: string; single: string; icon: typeof Calendar }> = {
  agenda: { label: "Agenda", single: "Agendapunt", icon: Calendar },
  debat: { label: "Debatten", single: "Debat", icon: Mic },
  motie: { label: "Moties", single: "Motie", icon: Gavel },
  vraag: { label: "Vragen", single: "Vraag", icon: HelpCircle },
  amendement: { label: "Amendementen", single: "Amendement", icon: FileText },
  toezegging: { label: "Toezeggingen", single: "Toezegging", icon: Handshake },
};

const MONTHS_SHORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function dateLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function hiddenKey(persoonId: string) {
  return `kamerlid:${persoonId}:verborgen`;
}

export function KamerlidExplorer({ persoonId, items, stats }: { persoonId: string; items: KamerlidTimelineItem[]; stats: PersoonStats }) {
  const [tab, setTab] = useState<KamerlidItemKind | "alles">("alles");
  const [timeframe, setTimeframe] = useState<"aankomend" | "geweest" | "alles">("alles");
  const [q, setQ] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(hiddenKey(persoonId));
      if (raw) setHidden(new Set(JSON.parse(raw)));
    } catch {
      // localStorage niet beschikbaar; verborgen-status is dan alleen sessie-lokaal.
    }
  }, [persoonId]);

  function persistHidden(next: Set<string>) {
    setHidden(next);
    try {
      window.localStorage.setItem(hiddenKey(persoonId), JSON.stringify(Array.from(next)));
    } catch {
      // negeren: localStorage kan geblokkeerd zijn (prive-navigatie e.d.)
    }
  }

  function toggleHide(id: string) {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persistHidden(next);
  }

  const today = useMemo(() => new Date().toISOString(), []);

  function inTimeframe(item: KamerlidTimelineItem, frame: typeof timeframe) {
    if (!item.date) return frame !== "aankomend";
    if (frame === "aankomend") return item.date >= today;
    if (frame === "geweest") return item.date < today;
    return true;
  }

  function matches(item: KamerlidTimelineItem, ignore?: "tab" | "frame") {
    if (ignore !== "frame" && !inTimeframe(item, timeframe)) return false;
    if (!showHidden && hidden.has(item.id)) return false;
    if (ignore !== "tab" && tab !== "alles" && item.kind !== tab) return false;
    if (q) {
      const needle = q.toLowerCase();
      const haystack = [item.title, item.sub, item.meta, item.dossierLabel].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }

  const visible = items.filter((it) => matches(it));
  const upcoming = visible.filter((it) => it.date && it.date >= today).sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const past = visible
    .filter((it) => !it.date || it.date < today)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  const sections: { title: string; items: KamerlidTimelineItem[] }[] = [];
  if (timeframe !== "geweest" && upcoming.length) sections.push({ title: "Komt eraan", items: upcoming });
  if (timeframe !== "aankomend" && past.length) sections.push({ title: "Wat dit lid deed", items: past });

  const tabCounts = (Object.keys(KINDS) as KamerlidItemKind[]).map((key) => ({
    key,
    count: items.filter((it) => inTimeframe(it, timeframe) && it.kind === key && (showHidden || !hidden.has(it.id))).length,
  }));
  const allCount = items.filter((it) => inTimeframe(it, timeframe) && (showHidden || !hidden.has(it.id))).length;

  const hiddenInFrame = items.filter((it) => hidden.has(it.id) && inTimeframe(it, timeframe)).length;

  function resetAll() {
    setTab("alles");
    setTimeframe("alles");
    setQ("");
  }

  const openToezeggingen = items
    .filter((it) => it.kind === "toezegging" && it.deadlineLabel)
    .sort((a, b) => (b.deadlineLate ? 1 : 0) - (a.deadlineLate ? 1 : 0))
    .slice(0, 4);

  const motieBeslist = stats.motieAangenomen + stats.motieVerworpen;
  const motiePercentage = motieBeslist > 0 ? Math.round((stats.motieAangenomen / motieBeslist) * 100) : null;
  const fractieBeslist = stats.fractieMotieTotaal;
  const fractiePercentage = fractieBeslist > 0 ? Math.round((stats.fractieMotieAangenomen / fractieBeslist) * 100) : null;

  return (
    <div className="debat-body">
      <main style={{ minWidth: 0 }}>
        <Link className="text-link back-link" href="/kamerleden">
          <ArrowLeft size={16} aria-hidden="true" />
          Terug naar Kamerleden
        </Link>

        <div className="pill-toggle-group" style={{ flexWrap: "wrap", marginTop: 20, marginBottom: 10 }}>
          <button type="button" className={tab === "alles" ? "active" : undefined} onClick={() => setTab("alles")}>
            <SquareStack size={15} aria-hidden="true" />
            Alles
            <span className="count">{allCount}</span>
          </button>
          {tabCounts.map(({ key, count }) => {
            const Icon = KINDS[key].icon;
            return (
              <button type="button" key={key} className={tab === key ? "active" : undefined} onClick={() => setTab(key)}>
                <Icon size={15} aria-hidden="true" />
                {KINDS[key].label}
                <span className="count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="agenda-toolbar" style={{ paddingBottom: 16 }}>
          <div className="pill-toggle-group">
            <button type="button" className={timeframe === "aankomend" ? "active" : undefined} onClick={() => setTimeframe("aankomend")}>
              Aankomend
            </button>
            <button type="button" className={timeframe === "geweest" ? "active" : undefined} onClick={() => setTimeframe("geweest")}>
              Geweest
            </button>
            <button type="button" className={timeframe === "alles" ? "active" : undefined} onClick={() => setTimeframe("alles")}>
              Alles
            </button>
          </div>
          <div className="search-form">
            <Search size={18} aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek in het werk van dit lid" />
          </div>
        </div>

        <div className="agenda-summary">
          <span>
            <strong>{visible.length}</strong> {visible.length === 1 ? "item" : "items"}
          </span>
          {hiddenInFrame > 0 ? (
            <button className="agenda-active-chip" type="button" onClick={() => setShowHidden((v) => !v)}>
              {showHidden ? <Eye size={13} aria-hidden="true" /> : <EyeOff size={13} aria-hidden="true" />}
              <span>{showHidden ? "Verborgen items tonen" : `${hiddenInFrame} verborgen`}</span>
            </button>
          ) : null}
          {q ? (
            <button className="agenda-active-chip" type="button" onClick={() => setQ("")} style={{ marginLeft: "auto" }}>
              <span>&quot;{q}&quot;</span>
              <X size={13} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {sections.length === 0 ? (
          <div className="empty-tab-card" style={{ marginTop: 16 }}>
            <strong>Niets gevonden</strong>
            <p>Kies een andere periode of zet het filter uit.</p>
            <button className="primary-button" type="button" onClick={resetAll}>
              Alles tonen
            </button>
          </div>
        ) : (
          sections.map((sec) => (
            <section key={sec.title} style={{ marginTop: 8 }}>
              <div className="section-divider">
                <strong>{sec.title}</strong>
                <hr />
                <em>{sec.items.length === 1 ? "1 item" : `${sec.items.length} items`}</em>
              </div>
              <div className="item-card-list">
                {sec.items.map((it) => {
                  const Icon = KINDS[it.kind].icon;
                  const isHidden = hidden.has(it.id);
                  return (
                    <div className="item-card" key={it.id} style={isHidden ? { opacity: 0.55 } : undefined}>
                      <span className="item-card-icon">
                        <Icon size={18} aria-hidden="true" />
                      </span>
                      <div className="item-card-body">
                        {it.href ? (
                          <Link href={it.href}>{it.title}</Link>
                        ) : (
                          <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--tl-deep-purple)" }}>
                            {it.title}
                          </span>
                        )}
                        {it.sub ? <p>{it.sub}</p> : null}
                        <div className="item-card-tags">
                          <span className="item-card-tag">{KINDS[it.kind].single}</span>
                          {it.statusLabel ? (
                            <span className={`item-card-tag${it.statusTone === "positive" ? " positive" : it.statusTone === "negative" ? " negative" : ""}`}>
                              {it.statusLabel}
                            </span>
                          ) : null}
                          {it.date ? (
                            <span className="item-card-meta">
                              <Calendar size={13} aria-hidden="true" />
                              {dateLabel(it.date)}
                            </span>
                          ) : null}
                          {it.meta ? <span className="item-card-meta">{it.meta}</span> : null}
                          {it.dossierHref ? (
                            <Link href={it.dossierHref} className="item-card-meta" style={{ color: "var(--tl-indigo)" }}>
                              {it.dossierLabel}
                            </Link>
                          ) : null}
                          {it.deadlineLabel ? (
                            <span className={`item-card-tag${it.deadlineLate ? " negative" : ""}`}>{it.deadlineLabel}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="item-card-aside" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        {typeof it.voorStemmen === "number" ? (
                          <div style={{ display: "grid", gap: 2, justifyItems: "end" }}>
                            <strong>{it.voorStemmen}</strong>
                            <span>stemmen voor</span>
                          </div>
                        ) : null}
                        <button
                          type="button"
                          title={isHidden ? "Weer tonen" : "Verbergen"}
                          onClick={() => toggleHide(it.id)}
                          style={{
                            display: "grid",
                            placeItems: "center",
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            border: "1px solid var(--tl-line)",
                            background: "transparent",
                            color: "var(--tl-ink-500)",
                            cursor: "pointer",
                          }}
                        >
                          {isHidden ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      <aside className="debat-sidebar">
        {stats.nextActiviteit ? (
          <div className="sidebar-block">
            <span>Eerstvolgend optreden</span>
            <Link
              href={`/agenda/${stats.nextActiviteit.id}`}
              className="item-card"
              style={{ gridTemplateColumns: "minmax(0, 1fr)", boxShadow: "inset 0 0 0 1.5px rgba(253,89,36,.35)" }}
            >
              <div className="item-card-body">
                <span style={{ color: "#a33207", fontSize: 13, fontWeight: 700 }}>{dateLabel(stats.nextActiviteit.aanvangstijd)}</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--tl-deep-purple)" }}>
                  {stats.nextActiviteit.onderwerp ?? "Agendapunt"}
                </span>
                {stats.nextActiviteit.locatie ? <p>{stats.nextActiviteit.locatie}</p> : null}
                {stats.aankomendTotaal > 1 ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--tl-deep-purple)",
                    }}
                  >
                    Alle {stats.aankomendTotaal} komende optredens
                    <ArrowRight size={13} aria-hidden="true" />
                  </span>
                ) : null}
              </div>
            </Link>
          </div>
        ) : null}

        {openToezeggingen.length > 0 ? (
          <div className="sidebar-block">
            <span>Openstaande toezeggingen</span>
            <div className="sidebar-list">
              {openToezeggingen.map((t) => (
                <div className="sidebar-row stacked" key={t.id}>
                  <strong>{t.title}</strong>
                  <span style={{ color: t.deadlineLate ? "#a33207" : "var(--tl-ink-500)", fontWeight: t.deadlineLate ? 600 : 400 }}>
                    {t.deadlineLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {stats.topDossiers.length > 0 ? (
          <div className="sidebar-block">
            <span>Meest actief in dossiers</span>
            <div className="sidebar-list">
              {stats.topDossiers.map((d) => (
                <Link href={`/dossiers/${d.id}`} className="sidebar-row" key={d.id}>
                  <i>{d.nummer ?? ""}</i>
                  <div>
                    <strong>{d.titel ?? "Dossier"}</strong>
                    <span>{d.count}x betrokken</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {motiePercentage !== null ? (
          <div className="sidebar-block">
            <span>Succes van moties</span>
            <div className="item-card" style={{ gridTemplateColumns: "minmax(0, 1fr)", display: "grid", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 600, color: "var(--tl-deep-purple)", lineHeight: 1 }}>
                  {motiePercentage}%
                </span>
                <span style={{ fontSize: 13, color: "var(--tl-ink-500)" }}>
                  aangenomen, {stats.motieAangenomen} van {motieBeslist}
                </span>
              </div>
              <div className="item-vote-bar-track" style={{ height: 10 }}>
                <span style={{ width: `${motiePercentage}%`, background: "var(--tl-violet)" }} />
                <span style={{ width: `${100 - motiePercentage}%`, background: "rgba(36,36,36,.16)" }} />
              </div>
              {fractiePercentage !== null ? (
                <span style={{ fontSize: 12, color: "var(--tl-ink-500)", lineHeight: 1.4 }}>
                  Fractiegemiddelde {fractiePercentage} procent.
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
