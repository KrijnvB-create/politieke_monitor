"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarRange, FileText, MessagesSquare, Search, Users, X } from "lucide-react";
import { SaveButton } from "@/components/save-button";
import { createClient } from "@/lib/supabase/client";
import type { DbDossierOverview } from "@/lib/db";

type FaseKey = "lopend" | "initiatiefnota" | "afgerond" | "slapend";

const FASES: Record<FaseKey, { label: string; dot: string }> = {
  lopend: { label: "Lopend beleid", dot: "#9441e9" },
  initiatiefnota: { label: "Initiatiefnota", dot: "#512986" },
  afgerond: { label: "Afgerond", dot: "#a8a49c" },
  slapend: { label: "Slapend", dot: "#cfcbc3" },
};

const SLAPEND_DAYS = 90;

function daysAgo(iso: string | null, now: number): number {
  if (!iso) return Infinity;
  return Math.floor((now - new Date(iso).getTime()) / 86400000);
}

function faseOf(row: DbDossierOverview, days: number): FaseKey {
  if (row.afgesloten) return "afgerond";
  if (row.isInitiatiefnota) return "initiatiefnota";
  if (days > SLAPEND_DAYS) return "slapend";
  return "lopend";
}

function activityLabel(days: number): string {
  if (days === 0) return "vandaag bijgewerkt";
  if (days === 1) return "gisteren bijgewerkt";
  if (days < 30) return `${days} dagen geleden`;
  const maanden = Math.round(days / 30);
  return maanden === 1 ? "1 maand geleden" : `${maanden} maanden geleden`;
}

const PERIODS: { key: "week" | "maand" | "kwartaal" | "alles"; label: string; days: number }[] = [
  { key: "week", label: "Deze week beweging", days: 7 },
  { key: "maand", label: "Laatste 30 dagen", days: 30 },
  { key: "kwartaal", label: "Laatste 90 dagen", days: 90 },
  { key: "alles", label: "Alle dossiers", days: 99999 },
];

type PeriodKey = "week" | "maand" | "kwartaal" | "alles";
type SortKey = "activiteit" | "agenda" | "volume";

type Row = { raw: DbDossierOverview; days: number; fase: FaseKey };

export function DossiersExplorer({ rows }: { rows: DbDossierOverview[] }) {
  const [period, setPeriod] = useState<PeriodKey>("kwartaal");
  const [fases, setFases] = useState<FaseKey[]>([]);
  const [commissies, setCommissies] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("activiteit");
  const [onlyFollowed, setOnlyFollowed] = useState(false);
  const [onlyAgenda, setOnlyAgenda] = useState(false);
  const [dimDormant, setDimDormant] = useState(true);

  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user || !active) return;
      const { data } = await supabase.from("saved_items").select("ref_id").eq("user_id", user.id).eq("kind", "dossier");
      if (active) setFollowedIds(new Set((data ?? []).map((d) => d.ref_id)));
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const now = useMemo(() => Date.now(), []);

  const allRows = useMemo<Row[]>(() => {
    return rows.map((raw) => {
      const days = daysAgo(raw.gewijzigd_op, now);
      return { raw, days, fase: faseOf(raw, days) };
    });
  }, [rows, now]);

  function matches(row: Row, ignore?: "fase" | "commissie") {
    const periodDays = PERIODS.find((p) => p.key === period)!.days;
    if (row.days > periodDays) return false;
    if (ignore !== "fase" && fases.length && !fases.includes(row.fase)) return false;
    if (ignore !== "commissie" && commissies.length && !(row.raw.commissie && commissies.includes(row.raw.commissie)))
      return false;
    if (onlyFollowed && !followedIds.has(row.raw.id)) return false;
    if (onlyAgenda && !row.raw.nextAgenda) return false;
    if (q) {
      const needle = q.toLowerCase();
      const haystack = [row.raw.titel, row.raw.citeertitel, row.raw.nummer, row.raw.commissie].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }

  const visible = allRows.filter((r) => matches(r));

  const faseCounts = useMemo(() => {
    const counts: Record<FaseKey, number> = { lopend: 0, initiatiefnota: 0, afgerond: 0, slapend: 0 };
    for (const row of allRows) if (matches(row, "fase")) counts[row.fase] += 1;
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, period, commissies, q, onlyFollowed, onlyAgenda, followedIds]);

  const commissieCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of allRows) {
      if (!row.raw.commissie) continue;
      if (!matches(row, "commissie")) continue;
      counts.set(row.raw.commissie, (counts.get(row.raw.commissie) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, period, fases, q, onlyFollowed, onlyAgenda, followedIds]);

  const periodCounts = useMemo(() => {
    const counts: Record<PeriodKey, number> = { week: 0, maand: 0, kwartaal: 0, alles: 0 };
    for (const p of PERIODS) counts[p.key] = allRows.filter((r) => r.days <= p.days).length;
    return counts;
  }, [allRows]);

  function toggleFase(key: FaseKey) {
    setFases((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  }
  function toggleCommissie(name: string) {
    setCommissies((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  }
  function resetAll() {
    setFases([]);
    setCommissies([]);
    setQ("");
    setOnlyFollowed(false);
    setOnlyAgenda(false);
    setPeriod("kwartaal");
  }

  const activeChips: { label: string; clear: () => void }[] = [
    ...fases.map((f) => ({ label: FASES[f].label, clear: () => toggleFase(f) })),
    ...commissies.map((c) => ({ label: c, clear: () => toggleCommissie(c) })),
    ...(onlyFollowed ? [{ label: "Alleen gevolgd", clear: () => setOnlyFollowed(false) }] : []),
    ...(onlyAgenda ? [{ label: "Alleen met agendapunt", clear: () => setOnlyAgenda(false) }] : []),
    ...(q ? [{ label: `"${q}"`, clear: () => setQ("") }] : []),
  ];

  const sorted = useMemo(() => {
    const list = [...visible];
    if (sort === "agenda") {
      list.sort((a, b) => {
        const aHas = a.raw.nextAgenda ? 0 : 1;
        const bHas = b.raw.nextAgenda ? 0 : 1;
        if (aHas !== bHas) return aHas - bHas;
        if (a.raw.nextAgenda && b.raw.nextAgenda) return a.raw.nextAgenda.datum < b.raw.nextAgenda.datum ? -1 : 1;
        return a.days - b.days;
      });
    } else if (sort === "volume") {
      list.sort((a, b) => b.raw.docCount + b.raw.debatCount - (a.raw.docCount + a.raw.debatCount));
    } else {
      list.sort((a, b) => a.days - b.days);
    }
    return list;
  }, [visible, sort]);

  const followed = sorted.filter((r) => followedIds.has(r.raw.id));
  const others = sorted.filter((r) => !followedIds.has(r.raw.id));

  const totalDocs = useMemo(() => visible.reduce((sum, r) => sum + r.raw.docCount, 0), [visible]);
  const upcomingCount = useMemo(() => visible.filter((r) => r.raw.nextAgenda).length, [visible]);

  function renderCard(row: Row) {
    const { raw, days, fase } = row;
    const isFollowed = followedIds.has(raw.id);
    const quiet = dimDormant && fase === "slapend";
    const title = raw.titel ?? raw.citeertitel ?? "Dossier";

    return (
      <article className={quiet ? "agenda-item-card quiet" : "agenda-item-card"} key={raw.id}>
        <div className="agenda-item-time" style={{ borderLeftColor: quiet ? "#cfcbc3" : FASES[fase].dot }}>
          <strong>{raw.nummer ?? ""}</strong>
        </div>

        <div className="agenda-item-body">
          <Link href={`/dossiers/${encodeURIComponent(raw.id)}`}>{title}</Link>
          <div className="agenda-item-tags">
            <span className="item-card-tag">{FASES[fase].label}</span>
            {raw.commissie ? (
              <span className="item-card-meta">
                <Users size={13} aria-hidden="true" />
                {raw.commissie}
              </span>
            ) : null}
            <span className="item-card-meta">{activityLabel(days)}</span>
            {isFollowed ? <span className="item-card-tag positive">Gevolgd</span> : null}
          </div>
          {raw.nextAgenda ? (
            <span className="new-since-badge">
              <CalendarRange size={13} aria-hidden="true" />
              {new Date(raw.nextAgenda.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} - {raw.nextAgenda.titel}
            </span>
          ) : null}
        </div>

        <div className="agenda-item-actions dossier-stats">
          <Link href={`/dossiers/${encodeURIComponent(raw.id)}`} className="dossier-stat">
            <strong>{raw.docCount}</strong>
            <span>
              <FileText size={12} aria-hidden="true" />
              documenten
            </span>
          </Link>
          <Link href={`/dossiers/${encodeURIComponent(raw.id)}`} className="dossier-stat">
            <strong>{raw.debatCount}</strong>
            <span>
              <MessagesSquare size={12} aria-hidden="true" />
              debatten
            </span>
          </Link>
          <SaveButton kind="dossier" refId={raw.id} label={title} meta={{ Nummer: raw.nummer }} />
        </div>
      </article>
    );
  }

  return (
    <div className="agenda-layout">
      <aside className="agenda-sidebar">
        <div className="filter-group-head">
          <span className="filter-eyebrow">Filters</span>
          <button className="filter-clear" type="button" onClick={resetAll}>
            Wissen
          </button>
        </div>

        <div className="filter-group first">
          <span className="filter-group-title">Activiteit</span>
          <div className="period-list">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={p.key === period ? "active" : undefined}
                onClick={() => setPeriod(p.key)}
              >
                <span>{p.label}</span>
                <span>{periodCounts[p.key]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-group-title">Fase</span>
          <div className="checkbox-list">
            {(Object.keys(FASES) as FaseKey[]).map((k) => (
              <div className="checkbox-row" key={k}>
                <label>
                  <input type="checkbox" checked={fases.includes(k)} onChange={() => toggleFase(k)} />
                  <span>{FASES[k].label}</span>
                </label>
                <span className="checkbox-row-meta">
                  <i style={{ background: FASES[k].dot }} />
                  {faseCounts[k]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {commissieCounts.length > 0 ? (
          <div className="filter-group">
            <span className="filter-group-title">Commissie</span>
            <div className="checkbox-list scroll">
              {commissieCounts.map(([name, count]) => (
                <div className="checkbox-row" key={name}>
                  <label>
                    <input type="checkbox" checked={commissies.includes(name)} onChange={() => toggleCommissie(name)} />
                    <span>{name}</span>
                  </label>
                  <span className="checkbox-row-meta">{count}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="dim-panel">
          <div className="dim-panel-row">
            <div className="switch-row">
              <span>Alleen gevolgd</span>
              <label className="switch">
                <input type="checkbox" checked={onlyFollowed} onChange={(e) => setOnlyFollowed(e.target.checked)} />
                <span className="switch-track" />
              </label>
            </div>
            <span className="dim-panel-hint">De dossiers waarop je bent geabonneerd</span>
          </div>
          <div className="dim-panel-row">
            <div className="switch-row">
              <span>Alleen met agendapunt</span>
              <label className="switch">
                <input type="checkbox" checked={onlyAgenda} onChange={(e) => setOnlyAgenda(e.target.checked)} />
                <span className="switch-track" />
              </label>
            </div>
            <span className="dim-panel-hint">Dossiers waarover binnenkort wordt vergaderd</span>
          </div>
          <div className="dim-panel-row">
            <div className="switch-row">
              <span>Slapende dossiers dempen</span>
              <label className="switch">
                <input type="checkbox" checked={dimDormant} onChange={(e) => setDimDormant(e.target.checked)} />
                <span className="switch-track" />
              </label>
            </div>
            <span className="dim-panel-hint">Geen beweging in de laatste {SLAPEND_DAYS} dagen</span>
          </div>
        </div>
      </aside>

      <main style={{ minWidth: 0 }}>
        <div className="agenda-toolbar" style={{ paddingBottom: 20 }}>
          <div className="search-form">
            <Search size={18} aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek op dossiernaam of nummer" />
          </div>
          <div className="pill-toggle-group">
            <button type="button" className={sort === "activiteit" ? "active" : undefined} onClick={() => setSort("activiteit")}>
              Recent
            </button>
            <button type="button" className={sort === "agenda" ? "active" : undefined} onClick={() => setSort("agenda")}>
              Agenda
            </button>
            <button type="button" className={sort === "volume" ? "active" : undefined} onClick={() => setSort("volume")}>
              Omvang
            </button>
          </div>
        </div>

        <div className="agenda-summary">
          <span>
            <strong>{visible.length}</strong> van {allRows.length} dossiers
          </span>
          <span className="agenda-summary-sep" />
          <span>{totalDocs} documenten in deze selectie</span>
          {upcomingCount > 0 ? (
            <>
              <span className="agenda-summary-sep" />
              <span className="new-since-badge">
                <CalendarRange size={13} aria-hidden="true" />
                {upcomingCount} met agendapunt deze maand
              </span>
            </>
          ) : null}
          {activeChips.length > 0 ? (
            <div className="agenda-active-chips">
              {activeChips.map((chip) => (
                <button className="agenda-active-chip" type="button" key={chip.label} onClick={chip.clear}>
                  <span>{chip.label}</span>
                  <X size={13} aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {visible.length === 0 ? (
          <div className="empty-tab-card" style={{ marginTop: 24 }}>
            <strong>Geen dossiers in deze selectie</strong>
            <p>Zet een filter uit of verruim de activiteit om meer te zien.</p>
            <button className="primary-button" type="button" onClick={resetAll}>
              Filters wissen
            </button>
          </div>
        ) : (
          <>
            {followed.length > 0 ? (
              <section className="day-group">
                <div className="day-header">
                  <span className="day-header-title">
                    <span className="day-header-weekday">Mijn dossiers</span>
                  </span>
                  <span className="item-card-tag positive">Gevolgd</span>
                  <hr />
                  <span className="day-header-count">{followed.length === 1 ? "1 dossier" : `${followed.length} dossiers`}</span>
                </div>
                <div className="day-items">{followed.map(renderCard)}</div>
              </section>
            ) : null}

            <section className="day-group">
              <div className="day-header">
                <span className="day-header-title">
                  <span className="day-header-weekday">{followed.length > 0 ? "Overige dossiers" : "Alle dossiers"}</span>
                </span>
                <hr />
                <span className="day-header-count">{others.length === 1 ? "1 dossier" : `${others.length} dossiers`}</span>
              </div>
              <div className="day-items">{others.map(renderCard)}</div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
