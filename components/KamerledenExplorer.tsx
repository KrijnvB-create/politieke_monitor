"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, SortAsc, Users2 } from "lucide-react";
import type { MonitorItem } from "@/lib/tk";
import { personResourceUrl } from "@/lib/tk";
import { factionColor } from "@/lib/factions";
import { SaveButton } from "@/components/save-button";
import { createClient } from "@/lib/supabase/client";

type SortMode = "fractie" | "naam";

function stringMeta(meta: Record<string, unknown>, key: string) {
  const value = meta[key];
  return typeof value === "string" ? value : undefined;
}

function initialsOf(naam: string) {
  const parts = naam.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function KamerledenExplorer({ items }: { items: MonitorItem[] }) {
  const [q, setQ] = useState("");
  const [fracties, setFracties] = useState<string[]>([]);
  const [sort, setSort] = useState<SortMode>("fractie");
  const [onlyFollowed, setOnlyFollowed] = useState(false);
  const [followed, setFollowed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    async function loadFollowed() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase.from("saved_items").select("ref_id").eq("user_id", userData.user.id).eq("kind", "kamerlid");
      if (active && data) setFollowed(new Set(data.map((r) => r.ref_id as string)));
    }
    loadFollowed();
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => {
    return items.map((item) => ({
      item,
      fractie: stringMeta(item.meta, "Fractielabel") ?? "Onafhankelijk"
    }));
  }, [items]);

  function matches(row: (typeof rows)[number], ignore?: "fractie") {
    if (ignore !== "fractie" && fracties.length && !fracties.includes(row.fractie)) return false;
    if (onlyFollowed && !followed.has(row.item.id)) return false;
    if (q) {
      const needle = q.toLowerCase();
      if (!(row.item.title + " " + row.fractie).toLowerCase().includes(needle)) return false;
    }
    return true;
  }

  const visible = rows.filter((r) => matches(r));

  const fractionFilters = useMemo(() => {
    const names: string[] = [];
    for (const row of rows) {
      if (!names.includes(row.fractie)) names.push(row.fractie);
    }
    return names
      .map((name) => ({
        name,
        count: rows.filter((r) => r.fractie === name && matches(r, "fractie")).length
      }))
      .filter((f) => f.count > 0 || fracties.includes(f.name))
      .sort((a, b) => b.count - a.count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, onlyFollowed, followed]);

  const sorted = useMemo(() => {
    const list = visible.slice();
    if (sort === "naam") {
      list.sort((a, b) => {
        const lastA = a.item.title.split(" ").slice(-1)[0] ?? "";
        const lastB = b.item.title.split(" ").slice(-1)[0] ?? "";
        return lastA.localeCompare(lastB);
      });
      return [{ key: "Alle leden op naam", plain: true, list }];
    }
    list.sort((a, b) => a.fractie.localeCompare(b.fractie) || a.item.title.localeCompare(b.item.title));
    const groups: { key: string; plain: boolean; list: typeof list }[] = [];
    for (const row of list) {
      let g = groups.find((x) => x.key === row.fractie);
      if (!g) {
        g = { key: row.fractie, plain: false, list: [] };
        groups.push(g);
      }
      g.list.push(row);
    }
    return groups;
  }, [visible, sort]);

  function toggleFractie(name: string) {
    setFracties((prev) => (prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]));
  }

  function resetAll() {
    setFracties([]);
    setQ("");
    setOnlyFollowed(false);
  }

  const activeChips: { label: string; clear: () => void }[] = [
    ...fracties.map((f) => ({ label: f, clear: () => toggleFractie(f) })),
    ...(onlyFollowed ? [{ label: "Alleen gevolgd", clear: () => setOnlyFollowed(false) }] : []),
    ...(q ? [{ label: `"${q}"`, clear: () => setQ("") }] : [])
  ];

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
          <span className="filter-group-title">Fractie</span>
          <div className="checkbox-list scroll">
            {fractionFilters.map((f) => (
              <div className="checkbox-row" key={f.name}>
                <label>
                  <input type="checkbox" checked={fracties.includes(f.name)} onChange={() => toggleFractie(f.name)} />
                  <span>{f.name}</span>
                </label>
                <span className="checkbox-row-meta">
                  <i style={{ background: factionColor(f.name), width: 18, height: 5, borderRadius: 3 }} />
                  {f.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="dim-panel">
          <div className="dim-panel-row">
            <div className="switch-row">
              <span>Alleen gevolgd</span>
              <label className="switch">
                <input type="checkbox" checked={onlyFollowed} onChange={(e) => setOnlyFollowed(e.target.checked)} />
                <span className="switch-track" />
              </label>
            </div>
            <span className="dim-panel-hint">De leden die je in de gaten houdt</span>
          </div>
        </div>
      </aside>

      <main style={{ minWidth: 0 }}>
        <div className="agenda-toolbar" style={{ paddingBottom: 20 }}>
          <div className="search-form">
            <Search size={18} aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek op naam of fractie" />
          </div>
          <div className="pill-toggle-group">
            <button type="button" className={sort === "fractie" ? "active" : undefined} onClick={() => setSort("fractie")}>
              <Users2 size={15} aria-hidden="true" />
              Fractie
            </button>
            <button type="button" className={sort === "naam" ? "active" : undefined} onClick={() => setSort("naam")}>
              <SortAsc size={15} aria-hidden="true" />
              A-Z
            </button>
          </div>
        </div>

        <div className="agenda-summary">
          <span>
            <strong>{visible.length}</strong> van {rows.length} leden
          </span>
          {activeChips.length > 0 ? (
            <div className="agenda-active-chips">
              {activeChips.map((chip) => (
                <button className="agenda-active-chip" type="button" key={chip.label} onClick={chip.clear}>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {sorted.length === 0 ? (
          <div className="empty-tab-card" style={{ marginTop: 24 }}>
            <strong>Geen leden in deze selectie</strong>
            <p>Zet een filter uit of probeer een andere zoekterm.</p>
            <button className="primary-button" type="button" onClick={resetAll}>
              Filters wissen
            </button>
          </div>
        ) : (
          sorted.map((group) => (
            <section className="day-group" key={group.key}>
              <div className="day-header">
                <span className="day-header-title">
                  <span
                    className="day-header-weekday"
                    style={{ fontSize: 22 }}
                  >
                    {group.key}
                  </span>
                </span>
                <hr />
                <span className="day-header-count">{group.list.length === 1 ? "1 lid" : `${group.list.length} leden`}</span>
              </div>

              <div className="member-tile-grid">
                {group.list.map((row) => {
                  const isFollowed = followed.has(row.item.id);
                  const photo = personResourceUrl(row.item.id);
                  return (
                    <article className={isFollowed ? "member-tile followed" : "member-tile"} key={row.item.id}>
                      <div className="member-tile-head">
                        <span className="member-tile-avatar">
                          {photo ? <img src={photo} alt="" loading="lazy" /> : null}
                          <span>{initialsOf(row.item.title)}</span>
                        </span>
                        <div className="member-tile-info">
                          <Link href={`/kamerleden/${encodeURIComponent(row.item.id)}`}>{row.item.title}</Link>
                          <span className="member-tile-faction">
                            <i style={{ background: factionColor(row.fractie) }} />
                            <span>{row.fractie}</span>
                          </span>
                        </div>
                      </div>
                      <SaveButton kind="kamerlid" refId={row.item.id} label={row.item.title} meta={row.item.meta} />
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
