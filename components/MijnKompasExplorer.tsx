"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Calendar,
  CalendarRange,
  CheckCheck,
  Eye,
  EyeOff,
  FileText,
  Gavel,
  Handshake,
  HelpCircle,
  Mic,
  Search,
  SquareStack,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SavedItemKind } from "@/lib/saved-items";
import { factionColor } from "@/lib/factions";
import type { KompasFollowedDossier, KompasFollowedPersoon, KompasItem, KompasItemKind } from "@/lib/db";

const KINDS: Record<KompasItemKind, { label: string; single: string; icon: typeof Calendar }> = {
  agenda: { label: "Agenda", single: "Agendapunt", icon: CalendarRange },
  debat: { label: "Debatten", single: "Debat", icon: Mic },
  brief: { label: "Kamerbrieven", single: "Kamerbrief", icon: FileText },
  motie: { label: "Moties", single: "Motie", icon: Gavel },
  vraag: { label: "Vragen", single: "Vraag", icon: HelpCircle },
  toezegging: { label: "Toezeggingen", single: "Toezegging", icon: Handshake },
};

const KIND_ORDER: KompasItemKind[] = ["agenda", "debat", "brief", "motie", "vraag", "toezegging"];

type PeriodKey = "aankomend" | "week" | "maand" | "kwartaal" | "alles";
type ViewMode = "alles" | "ongelezen" | "bewaard";
type GroupBy = "datum" | "dossier" | "soort";
type StatKey = "nieuw" | "agenda" | "dossiers" | "kamerleden" | "laat";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "aankomend", label: "Aankomend" },
  { key: "week", label: "Afgelopen week" },
  { key: "maand", label: "Afgelopen maand" },
  { key: "kwartaal", label: "Afgelopen kwartaal" },
  { key: "alles", label: "Alles" },
];

const WEEKDAYS = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

const HIDDEN_KEY = "mijnkompas:verborgen";
const READ_KEY = "mijnkompas:gelezen-tot";

function defaultLastRead(): string {
  return new Date(Date.now() - 7 * 86400000).toISOString();
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function dateLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function inPeriod(item: KompasItem, period: PeriodKey, now: number): boolean {
  if (!item.date) return period === "alles";
  const t = new Date(item.date).getTime();
  if (period === "aankomend") return t >= now;
  if (period === "alles") return true;
  const days = period === "week" ? 7 : period === "maand" ? 30 : 90;
  return t < now && t >= now - days * 86400000;
}

interface MatchIgnore {
  period?: boolean;
  hidden?: boolean;
  soort?: boolean;
  view?: boolean;
  dossier?: boolean;
  persoon?: boolean;
}

interface Group {
  key: string;
  label: string;
  sublabel?: string;
  href?: string;
  isToday?: boolean;
  items: KompasItem[];
}

export function MijnKompasExplorer({
  items,
  followedDossiers,
  followedPersonen,
}: {
  items: KompasItem[];
  followedDossiers: KompasFollowedDossier[];
  followedPersonen: KompasFollowedPersoon[];
}) {
  const [period, setPeriod] = useState<PeriodKey>("week");
  const [soorten, setSoorten] = useState<Set<KompasItemKind>>(new Set());
  const [dossierFilter, setDossierFilter] = useState<Set<string>>(new Set());
  const [persoonFilter, setPersoonFilter] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("alles");
  const [groupBy, setGroupBy] = useState<GroupBy>("datum");
  const [dimDerived, setDimDerived] = useState(true);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [onlyKamerlidOnly, setOnlyKamerlidOnly] = useState(false);
  const [q, setQ] = useState("");
  const [activeStat, setActiveStat] = useState<StatKey | null>(null);

  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);
  const [lastRead, setLastRead] = useState<string>(defaultLastRead());

  useEffect(() => {
    try {
      const rawHidden = window.localStorage.getItem(HIDDEN_KEY);
      if (rawHidden) setHidden(new Set(JSON.parse(rawHidden)));
      const rawRead = window.localStorage.getItem(READ_KEY);
      if (rawRead) setLastRead(rawRead);
    } catch {
      // localStorage niet beschikbaar; dan werken lezen/verbergen alleen sessie-lokaal.
    }
  }, []);

  function persistHidden(next: Set<string>) {
    setHidden(next);
    try {
      window.localStorage.setItem(HIDDEN_KEY, JSON.stringify(Array.from(next)));
    } catch {
      // negeren: localStorage kan geblokkeerd zijn.
    }
  }

  function toggleHide(key: string) {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    persistHidden(next);
  }

  function hideGroup(groupItems: KompasItem[]) {
    const next = new Set(hidden);
    for (const it of groupItems) next.add(it.key);
    persistHidden(next);
  }

  function markAllRead() {
    const now = new Date().toISOString();
    setLastRead(now);
    try {
      window.localStorage.setItem(READ_KEY, now);
    } catch {
      // negeren
    }
  }

  function isUnread(item: KompasItem): boolean {
    return !!item.date && item.date > lastRead;
  }

  const now = useMemo(() => Date.now(), []);

  function matches(item: KompasItem, ignore: MatchIgnore = {}): boolean {
    if (!ignore.period && !inPeriod(item, period, now)) return false;
    if (!ignore.hidden && !showHidden && hidden.has(item.key)) return false;
    if (!ignore.soort && soorten.size > 0 && !soorten.has(item.kind)) return false;
    if (!ignore.view) {
      if (viewMode === "ongelezen" && !isUnread(item)) return false;
      if (viewMode === "bewaard" && !item.bookmarked) return false;
    }
    if (!ignore.dossier && dossierFilter.size > 0 && !item.reasons.some((r) => r.type === "dossier" && dossierFilter.has(r.id)))
      return false;
    if (!ignore.persoon && persoonFilter.size > 0 && !item.reasons.some((r) => r.type === "kamerlid" && persoonFilter.has(r.id)))
      return false;
    if (onlyOverdue && !item.deadlineLate) return false;
    if (onlyKamerlidOnly && !item.reasons.some((r) => r.type === "kamerlid")) return false;
    if (q) {
      const needle = q.toLowerCase();
      const haystack = [item.title, item.dossier?.titel, item.persoon?.naam].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }

  function resetAll() {
    setActiveStat(null);
    setPeriod("week");
    setSoorten(new Set());
    setDossierFilter(new Set());
    setPersoonFilter(new Set());
    setViewMode("alles");
    setOnlyOverdue(false);
    setOnlyKamerlidOnly(false);
    setQ("");
    setGroupBy("datum");
  }

  function applyStat(stat: StatKey) {
    if (activeStat === stat) {
      resetAll();
      return;
    }
    setActiveStat(stat);
    setOnlyOverdue(false);
    setOnlyKamerlidOnly(false);
    setGroupBy("datum");
    setViewMode("alles");
    setSoorten(new Set());
    setPeriod("alles");
    setDossierFilter(new Set());
    setPersoonFilter(new Set());
    setQ("");

    if (stat === "nieuw") setViewMode("ongelezen");
    else if (stat === "agenda") {
      setSoorten(new Set(["agenda"]));
      setPeriod("aankomend");
    } else if (stat === "dossiers") setGroupBy("dossier");
    else if (stat === "kamerleden") setOnlyKamerlidOnly(true);
    else if (stat === "laat") {
      setSoorten(new Set(["toezegging"]));
      setOnlyOverdue(true);
    }
  }

  function toggleSoort(k: KompasItemKind) {
    setActiveStat(null);
    setSoorten((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function toggleDossier(id: string) {
    setActiveStat(null);
    setDossierFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePersoon(id: string) {
    setActiveStat(null);
    setPersoonFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // --- Hero-cijfers: onafhankelijk van de actieve filters ------------------

  const totalNieuw = useMemo(() => items.filter(isUnread).length, [items, lastRead]);
  const totalAgenda = useMemo(
    () => items.filter((it) => it.kind === "agenda" && !!it.date && new Date(it.date).getTime() <= now + 14 * 86400000).length,
    [items, now]
  );
  const totalDossiers = followedDossiers.length;
  const totalKamerleden = followedPersonen.length;
  const totalLaat = useMemo(() => items.filter((it) => it.kind === "toezegging" && it.deadlineLate).length, [items]);

  const subtitle = useMemo(() => {
    const stukLabel = totalNieuw === 1 ? "nieuw stuk" : "nieuwe stukken";
    const dossierLabel = totalDossiers === 1 ? "dossier" : "dossiers";
    const persoonLabel = totalKamerleden === 1 ? "Kamerlid" : "Kamerleden";
    let text = `${totalNieuw} ${stukLabel} op ${totalDossiers} ${dossierLabel} en ${totalKamerleden} ${persoonLabel} die je volgt.`;
    if (totalLaat > 0) {
      text += ` ${totalLaat} ${totalLaat === 1 ? "toezegging is" : "toezeggingen zijn"} over de termijn.`;
    }
    return text;
  }, [totalNieuw, totalDossiers, totalKamerleden, totalLaat]);

  // --- Tellingen per filter-as, met de andere filters nog steeds toegepast --

  const periodCounts = useMemo(() => {
    const counts: Record<PeriodKey, number> = { aankomend: 0, week: 0, maand: 0, kwartaal: 0, alles: 0 };
    for (const p of PERIODS) {
      counts[p.key] = items.filter((it) => matches(it, { period: true }) && inPeriod(it, p.key, now)).length;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, soorten, viewMode, dossierFilter, persoonFilter, onlyOverdue, onlyKamerlidOnly, q, hidden, showHidden, lastRead, now]);

  const soortCounts = useMemo(() => {
    const counts: Partial<Record<KompasItemKind, number>> = {};
    for (const k of KIND_ORDER) {
      counts[k] = items.filter((it) => it.kind === k && matches(it, { soort: true })).length;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, period, viewMode, dossierFilter, persoonFilter, onlyOverdue, onlyKamerlidOnly, q, hidden, showHidden, lastRead]);

  const dossierCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of followedDossiers) {
      counts[d.id] = items.filter(
        (it) => it.reasons.some((r) => r.type === "dossier" && r.id === d.id) && matches(it, { dossier: true })
      ).length;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, period, soorten, viewMode, persoonFilter, onlyOverdue, onlyKamerlidOnly, q, hidden, showHidden, lastRead, followedDossiers]);

  const persoonCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of followedPersonen) {
      counts[p.id] = items.filter(
        (it) => it.reasons.some((r) => r.type === "kamerlid" && r.id === p.id) && matches(it, { persoon: true })
      ).length;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, period, soorten, viewMode, dossierFilter, onlyOverdue, onlyKamerlidOnly, q, hidden, showHidden, lastRead, followedPersonen]);

  const baseFiltered = useMemo(
    () => items.filter((it) => matches(it, { view: true })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, period, soorten, dossierFilter, persoonFilter, onlyOverdue, onlyKamerlidOnly, q, hidden, showHidden, lastRead]
  );
  const allCount = baseFiltered.length;
  const ongelezenCount = useMemo(() => baseFiltered.filter(isUnread).length, [baseFiltered, lastRead]);
  const bewaardCount = useMemo(() => baseFiltered.filter((it) => it.bookmarked).length, [baseFiltered]);

  const hiddenCount = useMemo(
    () => items.filter((it) => hidden.has(it.key) && matches(it, { hidden: true })).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, period, soorten, viewMode, dossierFilter, persoonFilter, onlyOverdue, onlyKamerlidOnly, q, hidden, lastRead]
  );

  const visible = useMemo(
    () => items.filter((it) => matches(it)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, period, soorten, viewMode, dossierFilter, persoonFilter, onlyOverdue, onlyKamerlidOnly, q, hidden, showHidden, lastRead]
  );

  const groups = useMemo<Group[]>(() => {
    if (groupBy === "soort") {
      return KIND_ORDER.map((k) => ({
        key: k,
        label: KINDS[k].label,
        items: visible.filter((it) => it.kind === k),
      })).filter((g) => g.items.length > 0);
    }

    if (groupBy === "dossier") {
      const map = new Map<string, Group>();
      for (const it of visible) {
        const id = it.dossier?.id ?? "__geen__";
        const g =
          map.get(id) ??
          ({
            key: id,
            label: it.dossier?.titel ?? "Zonder dossier",
            href: it.dossier ? `/dossiers/${it.dossier.id}` : undefined,
            items: [],
          } as Group);
        g.items.push(it);
        map.set(id, g);
      }
      return Array.from(map.values()).sort((a, b) => {
        const aMax = Math.max(0, ...a.items.map((i) => (i.date ? new Date(i.date).getTime() : 0)));
        const bMax = Math.max(0, ...b.items.map((i) => (i.date ? new Date(i.date).getTime() : 0)));
        return bMax - aMax;
      });
    }

    const map = new Map<string, KompasItem[]>();
    for (const it of visible) {
      const key = it.date ? dayKey(it.date) : "zonder-datum";
      const list = map.get(key) ?? [];
      list.push(it);
      map.set(key, list);
    }
    const todayKey = new Date().toISOString().slice(0, 10);
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, groupItems]) => {
        if (key === "zonder-datum") return { key, label: "Zonder datum", items: groupItems };
        const d = new Date(key);
        const isToday = key === todayKey;
        return {
          key,
          label: WEEKDAYS[d.getDay()],
          sublabel: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
          isToday,
          items: groupItems,
        };
      });
  }, [visible, groupBy]);

  const hasFollowProfile = followedDossiers.length > 0 || followedPersonen.length > 0;

  if (!hasFollowProfile && items.length === 0) {
    return (
      <div>
        <section className="debat-hero">
          <div className="debat-hero-inner">
            <p className="eyebrow" style={{ color: "var(--tl-orange)" }}>
              Mijn kompas
            </p>
            <h1 style={{ color: "var(--tl-on-dark)", fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 600 }}>
              Wat er speelt op wat jij volgt
            </h1>
            <p style={{ color: "var(--tl-on-dark-muted)", fontSize: 15, maxWidth: 560 }}>
              Volg dossiers en Kamerleden en zie hier automatisch nieuwe moties, kamerbrieven, debatten en toezeggingen terug.
            </p>
          </div>
        </section>
        <div style={{ width: "min(1180px, calc(100% - 36px))", margin: "0 auto", padding: "40px 0 64px" }}>
          <div className="empty-tab-card">
            <strong>Nog geen volgprofiel</strong>
            <p>Ga naar een dossier of Kamerlid en klik op &quot;Volgen&quot; om het hier terug te zien.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <Link className="primary-button inline-flex" href="/dossiers">
                Naar Dossiers
              </Link>
              <Link className="secondary-button inline-flex" href="/kamerleden">
                Naar Kamerleden
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <section className="debat-hero">
        <div className="debat-hero-inner">
          <div className="debat-hero-head">
            <div style={{ minWidth: 0 }}>
              <p className="eyebrow" style={{ color: "var(--tl-orange)", margin: 0 }}>
                Mijn kompas
              </p>
              <h1 style={{ margin: "10px 0 0" }}>Wat er speelt op wat jij volgt</h1>
              <p style={{ color: "var(--tl-on-dark-muted)", fontSize: 15, marginTop: 10, maxWidth: 640, lineHeight: 1.5 }}>{subtitle}</p>
            </div>
            <div className="debat-hero-actions">
              <button type="button" className="primary-button" onClick={markAllRead}>
                <CheckCheck size={16} aria-hidden="true" />
                Alles gelezen
              </button>
              <a href="#kompas-volgend" className="secondary-button" style={{ borderColor: "var(--tl-on-dark-line)", color: "var(--tl-on-dark)" }}>
                Abonnementen
              </a>
            </div>
          </div>

          <div className="debat-hero-stats">
            <button type="button" className={activeStat === "nieuw" ? "kompas-stat active" : "kompas-stat"} onClick={() => applyStat("nieuw")}>
              <strong>{totalNieuw}</strong>
              <span>Nieuw voor jou</span>
              <small>sinds {dateLabel(lastRead)}</small>
            </button>
            <button type="button" className={activeStat === "agenda" ? "kompas-stat active" : "kompas-stat"} onClick={() => applyStat("agenda")}>
              <strong>{totalAgenda}</strong>
              <span>Op de agenda</span>
              <small>komende twee weken</small>
            </button>
            <button type="button" className={activeStat === "dossiers" ? "kompas-stat active" : "kompas-stat"} onClick={() => applyStat("dossiers")}>
              <strong>{totalDossiers}</strong>
              <span>Dossiers gevolgd</span>
            </button>
            <button
              type="button"
              className={activeStat === "kamerleden" ? "kompas-stat active" : "kompas-stat"}
              onClick={() => applyStat("kamerleden")}
            >
              <strong>{totalKamerleden}</strong>
              <span>Kamerleden gevolgd</span>
            </button>
            <button
              type="button"
              className={activeStat === "laat" ? "kompas-stat active" : "kompas-stat"}
              onClick={() => applyStat("laat")}
              disabled={totalLaat === 0}
            >
              <strong style={totalLaat > 0 ? { color: "#ff9c7a" } : undefined}>{totalLaat}</strong>
              <span>Toezegging te laat</span>
            </button>
          </div>
        </div>
      </section>

      <div className="agenda-layout" style={{ width: "min(1180px, calc(100% - 36px))", margin: "0 auto", padding: "28px 0 64px" }}>
        <aside className="agenda-sidebar">
          <div className="filter-group-head">
            <span className="filter-eyebrow">Filters</span>
            <button className="filter-clear" type="button" onClick={resetAll}>
              Wissen
            </button>
          </div>

          <div className="filter-group first">
            <span className="filter-group-title">Periode</span>
            <div className="period-list">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={p.key === period ? "active" : undefined}
                  onClick={() => {
                    setActiveStat(null);
                    setPeriod(p.key);
                  }}
                >
                  <span>{p.label}</span>
                  <span>{periodCounts[p.key]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-group-title">Soort</span>
            <div className="checkbox-list">
              {KIND_ORDER.map((k) => (
                <div className="checkbox-row" key={k}>
                  <label>
                    <input type="checkbox" checked={soorten.has(k)} onChange={() => toggleSoort(k)} />
                    <span>{KINDS[k].label}</span>
                  </label>
                  <span className="checkbox-row-meta">{soortCounts[k] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>

          {followedDossiers.length > 0 || followedPersonen.length > 0 ? (
            <div className="filter-group" id="kompas-volgend">
              <span className="filter-group-title">Wat je volgt</span>
              {followedDossiers.length > 0 ? (
                <div className="chip-filter-group">
                  {followedDossiers.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className={dossierFilter.has(d.id) ? "chip-filter active" : "chip-filter"}
                      onClick={() => toggleDossier(d.id)}
                    >
                      {d.titel ?? "Dossier"}
                      <span>{dossierCounts[d.id] ?? 0}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {followedPersonen.length > 0 ? (
                <div className="chip-filter-group" style={{ marginTop: followedDossiers.length > 0 ? 8 : 0 }}>
                  {followedPersonen.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={persoonFilter.has(p.id) ? "chip-filter active" : "chip-filter"}
                      onClick={() => togglePersoon(p.id)}
                    >
                      <i
                        style={{
                          display: "inline-block",
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: factionColor(p.fractieAfkorting),
                        }}
                      />
                      {p.naam}
                      <span>{persoonCounts[p.id] ?? 0}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="dim-panel">
            <div className="dim-panel-row">
              <div className="switch-row">
                <span>Alleen ongelezen</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={viewMode === "ongelezen"}
                    onChange={(e) => {
                      setActiveStat(null);
                      setViewMode(e.target.checked ? "ongelezen" : "alles");
                    }}
                  />
                  <span className="switch-track" />
                </label>
              </div>
              <span className="dim-panel-hint">Alleen items sinds je laatste bezoek</span>
            </div>
            <div className="dim-panel-row">
              <div className="switch-row">
                <span>Alleen bewaard</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={viewMode === "bewaard"}
                    onChange={(e) => {
                      setActiveStat(null);
                      setViewMode(e.target.checked ? "bewaard" : "alles");
                    }}
                  />
                  <span className="switch-track" />
                </label>
              </div>
              <span className="dim-panel-hint">Items die je hebt bewaard</span>
            </div>
            <div className="dim-panel-row">
              <div className="switch-row">
                <span>Afgeleide stukken dempen</span>
                <label className="switch">
                  <input type="checkbox" checked={dimDerived} onChange={(e) => setDimDerived(e.target.checked)} />
                  <span className="switch-track" />
                </label>
              </div>
              <span className="dim-panel-hint">Agenda, debatten en toezeggingen minder opvallend tonen</span>
            </div>
          </div>
        </aside>

        <main style={{ minWidth: 0 }}>
          <div className="pill-toggle-group" style={{ flexWrap: "wrap", marginBottom: 16 }}>
            <button
              type="button"
              className={viewMode === "alles" ? "active" : undefined}
              onClick={() => {
                setActiveStat(null);
                setViewMode("alles");
              }}
            >
              <SquareStack size={15} aria-hidden="true" />
              Alles
              <span className="count">{allCount}</span>
            </button>
            <button
              type="button"
              className={viewMode === "ongelezen" ? "active" : undefined}
              onClick={() => {
                setActiveStat(null);
                setViewMode("ongelezen");
              }}
            >
              Ongelezen
              <span className="count">{ongelezenCount}</span>
            </button>
            <button
              type="button"
              className={viewMode === "bewaard" ? "active" : undefined}
              onClick={() => {
                setActiveStat(null);
                setViewMode("bewaard");
              }}
            >
              <Bookmark size={15} aria-hidden="true" />
              Bewaard
              <span className="count">{bewaardCount}</span>
            </button>
          </div>

          <div className="agenda-toolbar">
            <div className="search-form">
              <Search size={18} aria-hidden="true" />
              <input
                value={q}
                onChange={(e) => {
                  setActiveStat(null);
                  setQ(e.target.value);
                }}
                placeholder="Zoek binnen mijn kompas"
              />
            </div>
            <div className="pill-toggle-group">
              <button type="button" className={groupBy === "datum" ? "active" : undefined} onClick={() => setGroupBy("datum")}>
                Datum
              </button>
              <button type="button" className={groupBy === "dossier" ? "active" : undefined} onClick={() => setGroupBy("dossier")}>
                Dossier
              </button>
              <button type="button" className={groupBy === "soort" ? "active" : undefined} onClick={() => setGroupBy("soort")}>
                Soort
              </button>
            </div>
          </div>

          <div className="agenda-summary">
            <span>
              <strong>{visible.length}</strong> van {baseFiltered.length} items
            </span>
            <span className="agenda-summary-sep" />
            <span>nieuwste eerst</span>
            {hiddenCount > 0 ? (
              <button className="agenda-active-chip" type="button" onClick={() => setShowHidden((v) => !v)}>
                {showHidden ? <Eye size={13} aria-hidden="true" /> : <EyeOff size={13} aria-hidden="true" />}
                <span>{showHidden ? "Verborgen items tonen" : `${hiddenCount} verborgen`}</span>
              </button>
            ) : null}
          </div>

          {groups.length === 0 ? (
            <div className="empty-tab-card" style={{ marginTop: 24 }}>
              <strong>Niets gevonden</strong>
              <p>Zet een filter uit of verruim de periode om meer te zien.</p>
              <button className="primary-button" type="button" onClick={resetAll}>
                Filters wissen
              </button>
            </div>
          ) : (
            groups.map((group) => (
              <section className="day-group" key={group.key}>
                <div className={group.isToday ? "day-header today" : "day-header"}>
                  <span className="day-header-title">
                    {group.href ? (
                      <Link href={group.href} className="day-header-weekday">
                        {group.label}
                      </Link>
                    ) : (
                      <span className="day-header-weekday">{group.label}</span>
                    )}
                    {group.sublabel ? <span className="day-header-date">{group.sublabel}</span> : null}
                  </span>
                  {group.isToday ? <span className="item-card-tag positive">Vandaag</span> : null}
                  <hr />
                  <span className="day-header-count">{group.items.length === 1 ? "1 item" : `${group.items.length} items`}</span>
                  <button
                    type="button"
                    className="kompas-icon-button"
                    title="Deze groep verbergen"
                    onClick={() => hideGroup(group.items)}
                  >
                    <EyeOff size={13} aria-hidden="true" />
                  </button>
                </div>
                <div className="day-items">
                  {group.items.map((item) => {
                    const Icon = KINDS[item.kind].icon;
                    const isHiddenItem = hidden.has(item.key);
                    const unread = isUnread(item);
                    const dim = dimDerived && item.derived && !isHiddenItem;
                    return (
                      <div className="item-card" key={item.key} style={{ opacity: isHiddenItem ? 0.55 : dim ? 0.6 : 1 }}>
                        <span className="item-card-icon">
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <div className="item-card-body">
                          {item.href ? (
                            <Link href={item.href}>{item.title}</Link>
                          ) : (
                            <span
                              style={{
                                fontFamily: "var(--font-display)",
                                fontSize: 16,
                                fontWeight: 600,
                                color: "var(--tl-deep-purple)",
                              }}
                            >
                              {item.title}
                            </span>
                          )}
                          <div className="item-card-tags">
                            <span className="item-card-tag">{KINDS[item.kind].single}</span>
                            {unread ? (
                              <span className="item-card-tag positive">
                                <span className="new-dot" />
                                Nieuw
                              </span>
                            ) : null}
                            {item.statusLabel ? (
                              <span
                                className={`item-card-tag${
                                  item.statusTone === "positive" ? " positive" : item.statusTone === "negative" ? " negative" : ""
                                }`}
                              >
                                {item.statusLabel}
                              </span>
                            ) : null}
                            {item.date ? (
                              <span className="item-card-meta">
                                <Calendar size={13} aria-hidden="true" />
                                {dateLabel(item.date)}
                              </span>
                            ) : null}
                            {item.dossier ? (
                              <Link href={`/dossiers/${item.dossier.id}`} className="item-card-meta" style={{ color: "var(--tl-indigo)" }}>
                                {item.dossier.titel ?? "Dossier"}
                              </Link>
                            ) : null}
                            {item.persoon ? (
                              <Link
                                href={`/kamerleden/${item.persoon.id}`}
                                className="item-card-meta"
                                style={{ color: "var(--tl-indigo)" }}
                              >
                                {item.persoon.naam}
                              </Link>
                            ) : null}
                            {item.deadlineLabel ? (
                              <span className={`item-card-tag${item.deadlineLate ? " negative" : ""}`}>{item.deadlineLabel}</span>
                            ) : null}
                            {item.reasons.map((r) => (
                              <span key={`${r.type}-${r.id}`} className="item-card-meta" title={r.label}>
                                {r.type === "dossier" ? "Dossier gevolgd" : r.type === "kamerlid" ? "Kamerlid gevolgd" : "Bewaard"}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="item-card-aside" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          {item.savedKind && item.savedRefId ? (
                            <BookmarkToggle kind={item.savedKind} refId={item.savedRefId} label={item.title} initialSaved={item.bookmarked} />
                          ) : null}
                          <button
                            type="button"
                            className="kompas-icon-button"
                            title={isHiddenItem ? "Weer tonen" : "Verbergen"}
                            onClick={() => toggleHide(item.key)}
                          >
                            {isHiddenItem ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
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
      </div>
    </div>
  );
}

function BookmarkToggle({
  kind,
  refId,
  label,
  initialSaved,
}: {
  kind: SavedItemKind;
  refId: string;
  label: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    if (saved) {
      await supabase.from("saved_items").delete().eq("user_id", user.id).eq("kind", kind).eq("ref_id", refId);
      setSaved(false);
    } else {
      const { error } = await supabase.from("saved_items").insert({ user_id: user.id, kind, ref_id: refId, label });
      if (!error || error.code === "23505") setSaved(true);
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      className={saved ? "kompas-icon-button active" : "kompas-icon-button"}
      onClick={toggle}
      disabled={busy}
      title={saved ? "Bewaard - klik om te verwijderen" : "Bewaren"}
    >
      {saved ? <BookmarkCheck size={14} aria-hidden="true" /> : <Bookmark size={14} aria-hidden="true" />}
    </button>
  );
}
