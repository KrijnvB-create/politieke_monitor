"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LayoutGrid, MapPin, Rows3, Search, Users, X } from "lucide-react";
import type { MonitorItem } from "@/lib/tk";
import { SaveButton } from "@/components/save-button";

type ActMeta = {
  Aanvangstijd?: string;
  Eindtijd?: string;
  Locatie?: string;
  Status?: string;
  Soort?: string;
  Voortouwcommissie?: { NaamNL?: string; Afkorting?: string };
};

type Category = "debat" | "briefing" | "procedureel" | "reis" | "overig";
type Mode = "upcoming" | "geschiedenis";

const CATS: Record<Category, { label: string; dot: string }> = {
  debat: { label: "Debatten en wetgeving", dot: "#9441e9" },
  briefing: { label: "Briefings en gesprekken", dot: "#512986" },
  procedureel: { label: "Procedureel", dot: "#a8a49c" },
  reis: { label: "Werkbezoek en delegatie", dot: "#fd5924" },
  overig: { label: "Overig", dot: "#23154e" }
};

const CAT_OF: Record<string, Category> = {
  Commissiedebat: "debat",
  "Plenair debat": "debat",
  Tweeminutendebat: "debat",
  Wetgevingsoverleg: "debat",
  Notaoverleg: "debat",
  "Technische briefing": "briefing",
  Rondetafelgesprek: "briefing",
  Gesprek: "briefing",
  Verhoor: "briefing",
  Petitie: "briefing",
  Procedurevergadering: "procedureel",
  "Inbreng schriftelijk overleg": "procedureel",
  "Inbreng verslag": "procedureel",
  "Inbreng feitelijke vragen": "procedureel",
  Werkbezoek: "reis",
  Delegatievergadering: "reis"
};

function categoryOf(soort: string | undefined): Category {
  if (!soort) return "overig";
  return CAT_OF[soort] ?? "overig";
}

const PERIOD_SETS: Record<Mode, { key: "vandaag" | "week" | "twee" | "alles"; label: string; days: number }[]> = {
  upcoming: [
    { key: "vandaag", label: "Vandaag", days: 1 },
    { key: "week", label: "Deze week", days: 5 },
    { key: "twee", label: "Komende 2 weken", days: 14 },
    { key: "alles", label: "Alles vooruit", days: 999 }
  ],
  geschiedenis: [
    { key: "vandaag", label: "Vandaag", days: 1 },
    { key: "week", label: "Afgelopen week", days: 7 },
    { key: "twee", label: "Afgelopen 2 weken", days: 14 },
    { key: "alles", label: "Alles terug", days: 999 }
  ]
};

type PeriodKey = "vandaag" | "week" | "twee" | "alles";

const WEEKDAYS = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
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
  "december"
];

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function inPeriod(dateKey: string, todayKey: string, key: PeriodKey, mode: Mode) {
  const days = PERIOD_SETS[mode].find((p) => p.key === key)!.days;
  const diff = Math.round((new Date(dateKey).getTime() - new Date(todayKey).getTime()) / 86400000);
  if (mode === "geschiedenis") return diff <= 0 && diff > -days;
  return diff >= 0 && diff < days;
}

function formatTijd(iso: string) {
  return new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

function formatDuur(aanvang?: string, eind?: string) {
  if (!aanvang || !eind) return "";
  const ms = new Date(eind).getTime() - new Date(aanvang).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const minuten = Math.round(ms / 60000);
  if (minuten >= 600) return "hele dag";
  const uren = Math.floor(minuten / 60);
  const rest = minuten % 60;
  if (uren === 0) return `${rest} min`;
  if (rest === 0) return `${uren} uur`;
  return `${uren}u ${rest}m`;
}

type Row = {
  item: MonitorItem;
  meta: ActMeta;
  cat: Category;
  cieName: string | null;
  dateKey: string;
};

export function AgendaExplorer({ items, mode = "upcoming" }: { items: MonitorItem[]; mode?: Mode }) {
  const PERIODS = PERIOD_SETS[mode];
  const [period, setPeriod] = useState<PeriodKey>("week");
  const [types, setTypes] = useState<Category[]>([]);
  const [cies, setCies] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [dim, setDim] = useState(true);
  const [wide, setWide] = useState(false);

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const rows = useMemo<Row[]>(() => {
    return items
      .map((item) => {
        const meta = item.meta as ActMeta;
        const aanvang = meta.Aanvangstijd;
        if (!aanvang) return null;
        return {
          item,
          meta,
          cat: categoryOf(meta.Soort ?? item.eyebrow),
          cieName: meta.Voortouwcommissie?.NaamNL ?? meta.Voortouwcommissie?.Afkorting ?? null,
          dateKey: dayKey(aanvang)
        };
      })
      .filter((r): r is Row => r !== null);
  }, [items]);

  function matches(row: Row, ignore?: "type" | "cie") {
    if (!inPeriod(row.dateKey, todayKey, period, mode)) return false;
    if (ignore !== "type" && types.length && !types.includes(row.cat)) return false;
    if (ignore !== "cie" && cies.length && !(row.cieName && cies.includes(row.cieName))) return false;
    if (q) {
      const needle = q.toLowerCase();
      const haystack = [row.item.title, row.cieName, row.meta.Soort, row.meta.Locatie]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  }

  const visible = rows.filter((r) => matches(r));

  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of visible) {
      const list = map.get(row.dateKey) ?? [];
      list.push(row);
      map.set(row.dateKey, list);
    }
    const entries = Array.from(map.entries());
    entries.sort(([a], [b]) => (mode === "geschiedenis" ? b.localeCompare(a) : a.localeCompare(b)));
    return entries;
  }, [visible, mode]);

  const typeCounts = useMemo(() => {
    const counts: Record<Category, number> = { debat: 0, briefing: 0, procedureel: 0, reis: 0, overig: 0 };
    for (const row of rows) {
      if (matches(row, "type")) counts[row.cat] += 1;
    }
    return counts;
  }, [rows, period, cies, q]);

  const cieCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (!row.cieName) continue;
      if (!matches(row, "cie")) continue;
      counts.set(row.cieName, (counts.get(row.cieName) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14);
  }, [rows, period, types, q]);

  const periodCounts = useMemo(() => {
    const counts: Record<PeriodKey, number> = { vandaag: 0, week: 0, twee: 0, alles: 0 };
    for (const p of PERIODS) {
      counts[p.key] = rows.filter((r) => inPeriod(r.dateKey, todayKey, p.key, mode)).length;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, todayKey, mode]);

  function toggleType(cat: Category) {
    setTypes((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  function toggleCie(name: string) {
    setCies((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  }

  function resetAll() {
    setTypes([]);
    setCies([]);
    setQ("");
    setPeriod("week");
  }

  const activeChips: { label: string; clear: () => void }[] = [
    ...types.map((t) => ({ label: CATS[t].label, clear: () => toggleType(t) })),
    ...cies.map((c) => ({ label: c, clear: () => toggleCie(c) })),
    ...(q ? [{ label: `"${q}"`, clear: () => setQ("") }] : [])
  ];

  const total = periodCounts[period];

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
          <span className="filter-group-title">Soort activiteit</span>
          <div className="checkbox-list">
            {(Object.keys(CATS) as Category[]).map((k) => (
              <div className="checkbox-row" key={k}>
                <label>
                  <input type="checkbox" checked={types.includes(k)} onChange={() => toggleType(k)} />
                  <span>{CATS[k].label}</span>
                </label>
                <span className="checkbox-row-meta">
                  <i style={{ background: CATS[k].dot }} />
                  {typeCounts[k]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {cieCounts.length > 0 ? (
          <div className="filter-group">
            <span className="filter-group-title">Commissie</span>
            <div className="checkbox-list scroll">
              {cieCounts.map(([name, count]) => (
                <div className="checkbox-row" key={name}>
                  <label>
                    <input type="checkbox" checked={cies.includes(name)} onChange={() => toggleCie(name)} />
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
              <span>Procedureel dempen</span>
              <label className="switch">
                <input type="checkbox" checked={dim} onChange={(e) => setDim(e.target.checked)} />
                <span className="switch-track" />
              </label>
            </div>
            <span className="dim-panel-hint">PV&apos;s, inbreng en verplaatste items rustiger tonen</span>
          </div>
        </div>
      </aside>

      <main style={{ minWidth: 0 }}>
        <div className="agenda-toolbar" style={{ paddingBottom: 20 }}>
          <div className="search-form">
            <Search size={18} aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Zoek op onderwerp, zaal of soort debat"
            />
          </div>
          <button className="agenda-view-toggle" type="button" onClick={() => setWide((v) => !v)}>
            {wide ? <Rows3 size={16} aria-hidden="true" /> : <LayoutGrid size={16} aria-hidden="true" />}
            {wide ? "Lijst" : "Dagen"}
          </button>
        </div>

        <div className="agenda-summary">
          <span>
            <strong>{visible.length}</strong> van {total} activiteiten
          </span>
          <span className="agenda-summary-sep" />
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
            <strong>Geen activiteiten in deze selectie</strong>
            <p>Verruim de periode of zet een filter uit om meer te zien.</p>
            <button className="primary-button" type="button" onClick={resetAll}>
              Filters wissen
            </button>
          </div>
        ) : (
          groups.map(([date, dayRows]) => {
            const d = new Date(date);
            const isToday = date === todayKey;
            return (
              <section className="day-group" key={date}>
                <div className={isToday ? "day-header today" : "day-header"}>
                  <span className="day-header-title">
                    <span className="day-header-weekday">{WEEKDAYS[d.getDay()]}</span>
                    <span className="day-header-date">
                      {d.getDate()} {MONTHS[d.getMonth()]}
                    </span>
                  </span>
                  {isToday ? <span className="item-card-tag positive">Vandaag</span> : null}
                  <hr />
                  <span className="day-header-count">
                    {dayRows.length === 1 ? "1 activiteit" : `${dayRows.length} activiteiten`}
                  </span>
                </div>

                <div className="day-items">
                  {dayRows.map((row) => {
                    const off = row.meta.Status && row.meta.Status !== "Gepland";
                    const cancelled = row.meta.Status === "Geannuleerd";
                    const quiet = dim && (row.cat === "procedureel" || Boolean(off));
                    const duur = formatDuur(row.meta.Aanvangstijd, row.meta.Eindtijd);
                    return (
                      <article className={quiet ? "agenda-item-card quiet" : "agenda-item-card"} key={row.item.id}>
                        <div className="agenda-item-time" style={{ borderLeftColor: quiet ? "#cfcbc3" : CATS[row.cat].dot }}>
                          <strong>{row.meta.Aanvangstijd ? formatTijd(row.meta.Aanvangstijd) : ""}</strong>
                          <span>{duur}</span>
                        </div>

                        <div className={cancelled ? "agenda-item-body cancelled" : "agenda-item-body"}>
                          <Link href={`/agenda/${encodeURIComponent(row.item.id)}`}>{row.item.title}</Link>
                          <div className="agenda-item-tags">
                            <span className="item-card-tag">{row.meta.Soort ?? row.item.eyebrow}</span>
                            {row.cieName ? (
                              <span className="item-card-meta">
                                <Users size={13} aria-hidden="true" />
                                {row.cieName}
                              </span>
                            ) : null}
                            {row.meta.Locatie ? (
                              <span className="item-card-meta">
                                <MapPin size={13} aria-hidden="true" />
                                {row.meta.Locatie}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="agenda-item-actions">
                          {off ? (
                            <span className={cancelled ? "item-card-tag negative" : "item-card-tag"}>
                              {row.meta.Status}
                            </span>
                          ) : null}
                          <SaveButton kind="activiteit" refId={row.item.id} label={row.item.title} meta={row.item.meta} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}
