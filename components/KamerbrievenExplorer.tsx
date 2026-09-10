"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileText, Folders, Landmark, Search, X } from "lucide-react";
import { SaveButton } from "@/components/save-button";
import { documentResourceUrl } from "@/lib/tk";
import { createClient } from "@/lib/supabase/client";
import type { DbDocument, DbKamerstukdossierLite } from "@/lib/db";

export type KamerbriefRow = {
  doc: DbDocument;
  afzender: string | null;
  dossier: DbKamerstukdossierLite | null;
};

type TypeKey = "brief" | "antwoord" | "nota" | "uitstel";

const TYPES: Record<TypeKey, { label: string; dot: string }> = {
  brief: { label: "Brief regering", dot: "#9441e9" },
  antwoord: { label: "Antwoord op Kamervragen", dot: "#512986" },
  nota: { label: "Nota naar aanleiding van verslag", dot: "#a8a49c" },
  uitstel: { label: "Uitstelbericht", dot: "#cfcbc3" },
};

function typeOf(soort: string | null): TypeKey {
  if (!soort) return "brief";
  if (soort.startsWith("Antwoord schriftelijke vragen")) return "antwoord";
  if (soort.startsWith("Nota n.a.v.")) return "nota";
  if (soort.startsWith("Mededeling")) return "uitstel";
  return "brief";
}

const PERIODS: { key: "week" | "twee" | "maand" | "alles"; label: string; days: number }[] = [
  { key: "week", label: "7 dagen", days: 7 },
  { key: "twee", label: "14 dagen", days: 14 },
  { key: "maand", label: "30 dagen", days: 30 },
  { key: "alles", label: "Vergaderjaar", days: 9999 },
];

type PeriodKey = "week" | "twee" | "maand" | "alles";
type Grouping = "datum" | "dossier";

const WEEKDAYS = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const MONTHS_SHORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const MONTHS = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

const LAST_VISIT_KEY = "kamerbrieven:laatste-bezoek";

function daysBetween(dateKey: string, todayKey: string) {
  return Math.round((new Date(todayKey).getTime() - new Date(dateKey).getTime()) / 86400000);
}

function inPeriod(dateKey: string, todayKey: string, key: PeriodKey) {
  const days = PERIODS.find((p) => p.key === key)!.days;
  const diff = daysBetween(dateKey, todayKey);
  return diff >= 0 && diff < days;
}

function dayLabel(dateKey: string, todayKey: string) {
  const diff = daysBetween(dateKey, todayKey);
  if (diff === 0) return "Vandaag";
  if (diff === 1) return "Gisteren";
  return WEEKDAYS[new Date(dateKey).getDay()];
}

type Row = {
  raw: KamerbriefRow;
  type: TypeKey;
  dateKey: string;
};

export function KamerbrievenExplorer({ rows }: { rows: KamerbriefRow[] }) {
  const [period, setPeriod] = useState<PeriodKey>("twee");
  const [types, setTypes] = useState<TypeKey[]>([]);
  const [afzenders, setAfzenders] = useState<string[]>([]);
  const [dossierIds, setDossierIds] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [grouping, setGrouping] = useState<Grouping>("datum");
  const [onlyNew, setOnlyNew] = useState(false);
  const [onlyFollowed, setOnlyFollowed] = useState(false);
  const [collapseAnswers, setCollapseAnswers] = useState(true);

  const [followedDossiers, setFollowedDossiers] = useState<{ ref_id: string; label: string | null }[]>([]);
  const [lastVisit, setLastVisit] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LAST_VISIT_KEY);
      setLastVisit(stored);
      window.localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    } catch {
      // localStorage niet beschikbaar (privenavigatie e.d.) -- dan gewoon geen ongelezen-markering
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user || !active) return;
      const { data } = await supabase.from("saved_items").select("ref_id, label").eq("user_id", user.id).eq("kind", "dossier");
      if (active) setFollowedDossiers(data ?? []);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const followedIds = useMemo(() => new Set(followedDossiers.map((d) => d.ref_id)), [followedDossiers]);
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const lastVisitDay = lastVisit ? lastVisit.slice(0, 10) : null;

  const allRows = useMemo<Row[]>(() => {
    return rows
      .map((raw) => {
        if (!raw.doc.datum) return null;
        return { raw, type: typeOf(raw.doc.soort), dateKey: raw.doc.datum };
      })
      .filter((r): r is Row => r !== null);
  }, [rows]);

  function isNew(row: Row) {
    return Boolean(lastVisitDay) && row.dateKey > lastVisitDay!;
  }

  function isFollowed(row: Row) {
    return Boolean(row.raw.dossier && followedIds.has(row.raw.dossier.id));
  }

  function matches(row: Row, ignore?: "type" | "afzender" | "dossier") {
    if (!inPeriod(row.dateKey, todayKey, period)) return false;
    if (ignore !== "type" && types.length && !types.includes(row.type)) return false;
    if (ignore !== "afzender" && afzenders.length && !(row.raw.afzender && afzenders.includes(row.raw.afzender))) return false;
    if (ignore !== "dossier" && dossierIds.length && !(row.raw.dossier && dossierIds.includes(row.raw.dossier.id)))
      return false;
    if (onlyNew && !isNew(row)) return false;
    if (onlyFollowed && !isFollowed(row)) return false;
    if (q) {
      const needle = q.toLowerCase();
      const haystack = [row.raw.doc.titel, row.raw.doc.onderwerp, row.raw.doc.nummer, row.raw.afzender, row.raw.dossier?.titel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }

  const visible = allRows.filter((r) => matches(r));

  const typeCounts = useMemo(() => {
    const counts: Record<TypeKey, number> = { brief: 0, antwoord: 0, nota: 0, uitstel: 0 };
    for (const row of allRows) if (matches(row, "type")) counts[row.type] += 1;
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, period, afzenders, dossierIds, q, onlyNew, onlyFollowed]);

  const afzenderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of allRows) {
      if (!row.raw.afzender) continue;
      if (!matches(row, "afzender")) continue;
      counts.set(row.raw.afzender, (counts.get(row.raw.afzender) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, period, types, q, onlyNew, onlyFollowed]);

  const dossierChips = useMemo(() => {
    return followedDossiers.map((d) => {
      const count = allRows.filter((row) => row.raw.dossier?.id === d.ref_id && matches(row, "dossier")).length;
      return { id: d.ref_id, label: d.label ?? "Dossier", count };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, followedDossiers, period, types, afzenders, q, onlyNew, onlyFollowed]);

  const periodCounts = useMemo(() => {
    const counts: Record<PeriodKey, number> = { week: 0, twee: 0, maand: 0, alles: 0 };
    for (const p of PERIODS) counts[p.key] = allRows.filter((r) => inPeriod(r.dateKey, todayKey, p.key)).length;
    return counts;
  }, [allRows, todayKey]);

  const newCount = useMemo(() => visible.filter((r) => isNew(r)).length, [visible, lastVisitDay]);

  function toggleType(key: TypeKey) {
    setTypes((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));
  }
  function toggleAfzender(name: string) {
    setAfzenders((prev) => (prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]));
  }
  function toggleDossier(id: string) {
    setDossierIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }
  function resetAll() {
    setTypes([]);
    setAfzenders([]);
    setDossierIds([]);
    setQ("");
    setOnlyNew(false);
    setOnlyFollowed(false);
    setPeriod("twee");
  }

  const activeChips: { label: string; clear: () => void }[] = [
    ...types.map((t) => ({ label: TYPES[t].label, clear: () => toggleType(t) })),
    ...afzenders.map((a) => ({ label: a, clear: () => toggleAfzender(a) })),
    ...dossierIds.map((id) => {
      const chip = dossierChips.find((c) => c.id === id);
      return { label: chip?.label ?? "Dossier", clear: () => toggleDossier(id) };
    }),
    ...(onlyNew ? [{ label: "Alleen ongelezen", clear: () => setOnlyNew(false) }] : []),
    ...(onlyFollowed ? [{ label: "Alleen mijn dossiers", clear: () => setOnlyFollowed(false) }] : []),
    ...(q ? [{ label: `"${q}"`, clear: () => setQ("") }] : []),
  ];

  const groups = useMemo(() => {
    if (grouping === "datum") {
      const map = new Map<string, Row[]>();
      for (const row of visible) {
        const list = map.get(row.dateKey) ?? [];
        list.push(row);
        map.set(row.dateKey, list);
      }
      return Array.from(map.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([key, list]) => ({
          key,
          title: dayLabel(key, todayKey),
          subtitle: `${new Date(key).getDate()} ${MONTHS[new Date(key).getMonth()]}`,
          isToday: key === todayKey,
          list,
        }));
    }

    const map = new Map<string, Row[]>();
    const zonderDossier: Row[] = [];
    for (const row of visible) {
      if (!row.raw.dossier) {
        zonderDossier.push(row);
        continue;
      }
      const list = map.get(row.raw.dossier.id) ?? [];
      list.push(row);
      map.set(row.raw.dossier.id, list);
    }
    const entries = Array.from(map.entries()).sort(([, a], [, b]) => b.length - a.length);
    const out = entries.map(([id, list]) => ({
      key: id,
      title: list[0].raw.dossier?.titel ?? "Dossier",
      subtitle: list[0].raw.dossier?.nummer ? `dossier ${list[0].raw.dossier.nummer}` : undefined,
      isToday: false,
      list,
    }));
    if (zonderDossier.length > 0) {
      out.push({ key: "zonder-dossier", title: "Zonder dossier", subtitle: undefined, isToday: false, list: zonderDossier });
    }
    return out;
  }, [visible, grouping, todayKey]);

  const rangeLabel = useMemo(() => {
    if (visible.length === 0) return null;
    const dates = visible.map((r) => r.dateKey).sort();
    const first = new Date(dates[0]);
    const last = new Date(dates[dates.length - 1]);
    const fmt = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
    return dates[0] === dates[dates.length - 1] ? fmt(first) : `${fmt(first)} tot ${fmt(last)}`;
  }, [visible]);

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
          <span className="filter-group-title">Periode</span>
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
          <span className="filter-group-title">Soort document</span>
          <div className="checkbox-list">
            {(Object.keys(TYPES) as TypeKey[]).map((k) => (
              <div className="checkbox-row" key={k}>
                <label>
                  <input type="checkbox" checked={types.includes(k)} onChange={() => toggleType(k)} />
                  <span>{TYPES[k].label}</span>
                </label>
                <span className="checkbox-row-meta">
                  <i style={{ background: TYPES[k].dot }} />
                  {typeCounts[k]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {afzenderCounts.length > 0 ? (
          <div className="filter-group">
            <span className="filter-group-title">Afzender</span>
            <div className="checkbox-list scroll">
              {afzenderCounts.map(([name, count]) => (
                <div className="checkbox-row" key={name}>
                  <label>
                    <input type="checkbox" checked={afzenders.includes(name)} onChange={() => toggleAfzender(name)} />
                    <span>{name}</span>
                  </label>
                  <span className="checkbox-row-meta">{count}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {dossierChips.length > 0 ? (
          <div className="filter-group">
            <span className="filter-group-title">Mijn dossiers</span>
            <div className="chip-filter-group">
              {dossierChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={dossierIds.includes(chip.id) ? "chip-filter active" : "chip-filter"}
                  onClick={() => toggleDossier(chip.id)}
                >
                  {chip.label}
                  <span>{chip.count}</span>
                </button>
              ))}
            </div>
            <Link className="filter-follow-link" href="/dossiers">
              Dossier volgen
            </Link>
          </div>
        ) : null}

        <div className="dim-panel">
          <div className="dim-panel-row">
            <div className="switch-row">
              <span>Alleen ongelezen</span>
              <label className="switch">
                <input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} />
                <span className="switch-track" />
              </label>
            </div>
            <span className="dim-panel-hint">Nieuw sinds je vorige bezoek</span>
          </div>
          <div className="dim-panel-row">
            <div className="switch-row">
              <span>Alleen mijn dossiers</span>
              <label className="switch">
                <input type="checkbox" checked={onlyFollowed} onChange={(e) => setOnlyFollowed(e.target.checked)} />
                <span className="switch-track" />
              </label>
            </div>
            <span className="dim-panel-hint">Filter op de dossiers die je volgt</span>
          </div>
          <div className="dim-panel-row">
            <div className="switch-row">
              <span>Antwoorden inklappen</span>
              <label className="switch">
                <input type="checkbox" checked={collapseAnswers} onChange={(e) => setCollapseAnswers(e.target.checked)} />
                <span className="switch-track" />
              </label>
            </div>
            <span className="dim-panel-hint">Antwoorden op vragen en nota&apos;s rustiger tonen</span>
          </div>
        </div>
      </aside>

      <main style={{ minWidth: 0 }}>
        <div className="agenda-toolbar" style={{ paddingBottom: 20 }}>
          <div className="search-form">
            <Search size={18} aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek in titel, onderwerp of nummer" />
          </div>
          <div className="pill-toggle-group">
            <button type="button" className={grouping === "datum" ? "active" : undefined} onClick={() => setGrouping("datum")}>
              Datum
            </button>
            <button type="button" className={grouping === "dossier" ? "active" : undefined} onClick={() => setGrouping("dossier")}>
              Dossier
            </button>
          </div>
        </div>

        <div className="agenda-summary">
          <span>
            <strong>{visible.length}</strong> van {allRows.length} documenten
          </span>
          {rangeLabel ? (
            <>
              <span className="agenda-summary-sep" />
              <span>{rangeLabel}</span>
            </>
          ) : null}
          {newCount > 0 ? (
            <>
              <span className="agenda-summary-sep" />
              <span className="new-since-badge">
                <i />
                {newCount} nieuw sinds je vorige bezoek
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

        {groups.length === 0 ? (
          <div className="empty-tab-card" style={{ marginTop: 24 }}>
            <strong>Geen documenten in deze selectie</strong>
            <p>Verruim de periode of zet een filter uit om meer te zien.</p>
            <button className="primary-button" type="button" onClick={resetAll}>
              Filters wissen
            </button>
          </div>
        ) : (
          groups.map((group) => (
            <section className="day-group" key={group.key}>
              <div className={group.isToday ? "day-header today" : "day-header"}>
                <span className="day-header-title">
                  <span className="day-header-weekday">{group.title}</span>
                  {group.subtitle ? <span className="day-header-date">{group.subtitle}</span> : null}
                </span>
                {group.isToday ? <span className="item-card-tag positive">Vandaag</span> : null}
                <hr />
                <span className="day-header-count">
                  {group.list.length === 1 ? "1 document" : `${group.list.length} documenten`}
                </span>
              </div>

              <div className="day-items">
                {group.list.map((row) => {
                  const { doc, afzender, dossier } = row.raw;
                  const documentId = doc.id;
                  const resourceUrl = documentResourceUrl(documentId);
                  const quiet = collapseAnswers && (row.type === "antwoord" || row.type === "nota" || row.type === "uitstel");
                  const title = doc.titel ?? doc.onderwerp ?? doc.soort ?? "Document";
                  const d = new Date(row.dateKey);

                  return (
                    <article className={quiet ? "agenda-item-card quiet" : "agenda-item-card"} key={doc.id}>
                      <div className="letter-item-date" style={{ borderLeftColor: quiet ? "#cfcbc3" : TYPES[row.type].dot }}>
                        <strong>{d.getDate()}</strong>
                        <span>{MONTHS_SHORT[d.getMonth()]}</span>
                      </div>

                      <div className="agenda-item-body">
                        <Link href={`/kamerbrieven/${encodeURIComponent(doc.id)}`}>
                          {isNew(row) ? <i className="new-dot" aria-hidden="true" /> : null}
                          {title}
                        </Link>
                        {!quiet && doc.onderwerp && doc.onderwerp !== title ? <p>{doc.onderwerp}</p> : null}
                        <div className="agenda-item-tags">
                          <span className="item-card-tag">{doc.soort}</span>
                          {afzender ? (
                            <span className="item-card-meta">
                              <Landmark size={13} aria-hidden="true" />
                              {afzender}
                            </span>
                          ) : null}
                          {dossier ? (
                            <span className="item-card-meta">
                              <Folders size={13} aria-hidden="true" />
                              {dossier.titel} {dossier.nummer}
                            </span>
                          ) : null}
                          {doc.nummer ? <span className="item-card-meta">{doc.nummer}</span> : null}
                          {dossier && followedIds.has(dossier.id) ? (
                            <span className="item-card-tag positive">Gevolgd</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="agenda-item-actions">
                        {resourceUrl ? (
                          <a className="secondary-button inline-flex" href={resourceUrl} target="_blank" rel="noreferrer">
                            <FileText size={16} aria-hidden="true" />
                            PDF
                          </a>
                        ) : null}
                        <SaveButton kind="kamerbrief" refId={doc.id} label={title} meta={{ Id: doc.id, Soort: doc.soort }} />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
