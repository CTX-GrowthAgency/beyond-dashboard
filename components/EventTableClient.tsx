"use client";

// app/events/EventsTableClient.tsx
// Client component — handles search, sort, filter, and CSV export.
// Receives pre-fetched serialized rows from the server page.

import { useState, useMemo } from "react";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface TicketTypeInfo { price: number; capacity?: number; }

interface EventRow {
  id:               string;
  title:            string;
  date?:            string;
  venueName:        string;
  status:           string;
  ticketTypes:      Record<string, TicketTypeInfo>;
  totalBookings:    number;
  totalRevenue:     number;
  totalTicketsSold: number;
}

interface Stats {
  totalEvents:      number;
  activeEvents:     number;
  totalRevenue:     number;
  totalTicketsSold: number;
}

type SortKey = "title" | "date" | "totalRevenue" | "totalTicketsSold";

/* ─── Helpers ───────────────────────────────────────────────────────────── */
function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function EventsTableClient({
  rows,
  stats,
}: {
  rows:  EventRow[];
  stats: Stats;
}) {
  const [q,        setQ       ] = useState("");
  const [statusF,  setStatusF ] = useState("all");
  const [sortKey,  setSortKey ] = useState<SortKey>("date");
  const [sortDir,  setSortDir ] = useState<"asc" | "desc">("desc");

  /* ── Sort handler ── */
  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  /* ── Sort icon ── */
  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span style={{ opacity: 0.18 }}>↕</span>;
    return <span style={{ color: "#c9b97a" }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  /* ── Filtered + sorted rows ── */
  const filtered = useMemo(() => {
    let out = [...rows];

    // text search
    if (q.trim()) {
      const lower = q.toLowerCase();
      out = out.filter(
        (r) =>
          r.title.toLowerCase().includes(lower) ||
          r.venueName.toLowerCase().includes(lower) ||
          r.id.toLowerCase().includes(lower)
      );
    }

    // status filter
    if (statusF !== "all") out = out.filter((r) => r.status === statusF);

    // sort
    out.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc"
          ? av.toLowerCase().localeCompare(bv.toLowerCase())
          : bv.toLowerCase().localeCompare(av.toLowerCase());
      }
      if (av < bv) return sortDir === "asc" ? -1 :  1;
      if (av > bv) return sortDir === "asc" ?  1 : -1;
      return 0;
    });

    return out;
  }, [rows, q, statusF, sortKey, sortDir]);

  /* ── CSV export ── */
  async function handleExportCSV() {
    const params = new URLSearchParams({ type: "events" });
    if (statusF !== "all") params.set("status", statusF);

    const res  = await fetch(`/api/actions/export-csv?${params.toString()}`);
    if (!res.ok) { alert("Export failed"); return; }

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `beyond-events-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ─── Render ──────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');

        :root {
          --bg:        #0a0a0a;
          --surf:      #111111;
          --surf2:     #161616;
          --border:    rgba(255,255,255,0.07);
          --text:      #f0ede6;
          --text2:     rgba(240,237,230,0.55);
          --text3:     rgba(240,237,230,0.3);
          --gold:      #c9b97a;
          --golddim:   rgba(201,185,122,0.12);
          --green:     #3ecf8e;
          --greendim:  rgba(62,207,142,0.12);
          --muted-dim: rgba(255,255,255,0.06);
        }

        /* ── Page header ── */
        .ev-header         { margin-bottom: 24px; }
        .ev-title          { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 0.04em; color: var(--text); line-height: 1; }
        .ev-sub            { font-size: 13px; color: var(--text2); margin-top: 6px; font-weight: 300; }

        /* ── Stat bar ── */
        .ev-stats          { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); margin-bottom: 24px; }
        .ev-stat           { background: var(--surf); padding: 18px 22px; }
        .ev-stat-label     { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text3); margin-bottom: 6px; }
        .ev-stat-value     { font-family: 'Bebas Neue', sans-serif; font-size: 30px; letter-spacing: 0.02em; color: var(--text); line-height: 1; }
        .ev-stat-value.gold  { color: var(--gold); }
        .ev-stat-value.green { color: var(--green); }

        /* ── Toolbar ── */
        .ev-toolbar        { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--border); flex-wrap: wrap; background: var(--surf); }

        /* ── Inputs ── */
        .ev-input          { background: var(--surf2); border: 1px solid var(--border); color: var(--text); padding: 0 12px; font-family: 'DM Sans', sans-serif; font-size: 13px; outline: none; height: 34px; transition: border-color 0.15s; }
        .ev-input:focus    { border-color: rgba(201,185,122,0.4); }
        .ev-input::placeholder { color: var(--text3); }
        select.ev-input    { min-width: 140px; cursor: pointer; }
        .ev-search         { min-width: 220px; }

        /* ── Button ── */
        .ev-btn            { display: inline-flex; align-items: center; gap: 6px; padding: 0 14px; height: 34px; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; background: transparent; color: var(--text2); border: 1px solid var(--border); cursor: pointer; transition: border-color 0.15s, color 0.15s; white-space: nowrap; }
        .ev-btn:hover      { border-color: rgba(255,255,255,0.18); color: var(--text); }
        .ev-ml-auto        { margin-left: auto; }

        /* ── Table wrap ── */
        .ev-table-wrap     { background: var(--surf); border: 1px solid var(--border); overflow: hidden; }
        .ev-scroll         { overflow-x: auto; }

        /* ── Table ── */
        table.ev-tbl       { width: 100%; border-collapse: collapse; font-family: 'DM Sans', sans-serif; }
        table.ev-tbl thead tr { border-bottom: 1px solid var(--border); }
        table.ev-tbl th    { padding: 10px 14px; text-align: left; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text3); font-weight: 600; white-space: nowrap; user-select: none; }
        table.ev-tbl th.sortable { cursor: pointer; }
        table.ev-tbl th.sortable:hover { color: var(--text2); }
        table.ev-tbl td    { padding: 11px 14px; font-size: 13px; color: var(--text2); border-bottom: 1px solid rgba(255,255,255,0.035); vertical-align: middle; }
        table.ev-tbl tr:last-child td { border-bottom: none; }
        table.ev-tbl tbody tr:hover td { background: rgba(255,255,255,0.018); color: var(--text); }

        /* ── Cell variants ── */
        .ev-cell-title     { font-weight: 500; color: var(--text); font-size: 13px; }
        .ev-cell-id        { font-family: monospace; font-size: 11px; color: var(--text3); margin-top: 2px; }
        .ev-cell-mono      { font-family: 'Bebas Neue', sans-serif; font-size: 17px; color: var(--text); letter-spacing: 0.02em; }
        .ev-cell-gold      { font-family: 'Bebas Neue', sans-serif; font-size: 17px; color: var(--gold); letter-spacing: 0.02em; }
        .ev-cell-dim       { color: var(--text3); }

        /* ── Badges ── */
        .ev-badge          { display: inline-flex; align-items: center; padding: 3px 8px; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }
        .ev-badge-green    { background: var(--greendim);  color: var(--green); }
        .ev-badge-muted    { background: var(--muted-dim); color: var(--text3); }

        /* ── Ticket type pills ── */
        .ev-ttype          { font-size: 11px; color: var(--text3); margin-bottom: 3px; line-height: 1.4; }
        .ev-ttype:last-child { margin-bottom: 0; }

        /* ── Empty state ── */
        .ev-empty          { padding: 56px 20px; text-align: center; }
        .ev-empty p        { font-size: 13px; color: var(--text3); }

        /* ── Result count ── */
        .ev-count          { font-size: 11px; color: var(--text3); white-space: nowrap; }

        /* ── Mobile Responsive ── */
        @media (max-width: 768px) {
          .ev-stats { grid-template-columns: 1fr 1fr; }
          .ev-stat { padding: 14px 16px; }
          .ev-stat-value { font-size: 24px; }
          
          .ev-toolbar { padding: 8px 12px; gap: 8px; }
          .ev-search { min-width: 160px; flex: 1; }
          .ev-input { font-size: 12px; height: 32px; padding: 0 8px; }
          select.ev-input { min-width: 120px; }
          .ev-btn { padding: 0 10px; font-size: 10px; }
          .ev-count { font-size: 10px; }
          
          .ev-title { font-size: 24px; }
          .ev-sub { font-size: 12px; }
          
          table.ev-tbl th { padding: 8px 10px; font-size: 9px; }
          table.ev-tbl td { padding: 8px 10px; font-size: 12px; }
          .ev-cell-title { font-size: 12px; }
          .ev-cell-id { font-size: 10px; }
          .ev-cell-mono, .ev-cell-gold { font-size: 14px; }
          .ev-ttype { font-size: 10px; }
          .ev-badge { font-size: 9px; padding: 2px 6px; }
        }

        @media (max-width: 480px) {
          .ev-stats { grid-template-columns: 1fr; }
          .ev-toolbar { flex-direction: column; align-items: stretch; }
          .ev-search { min-width: 100%; }
          .ev-ml-auto { margin-left: 0; margin-top: 8px; }
          
          .ev-title { font-size: 20px; }
          .ev-sub { font-size: 11px; }
          
          table.ev-tbl th { padding: 6px 8px; font-size: 8px; }
          table.ev-tbl td { padding: 6px 8px; font-size: 11px; }
          .ev-cell-title { font-size: 11px; }
          .ev-cell-id { font-size: 9px; }
          .ev-cell-mono, .ev-cell-gold { font-size: 12px; }
          .ev-ttype { font-size: 9px; }
          .ev-badge { font-size: 8px; padding: 1px 4px; }
        }
      `}</style>

      {/* ── Page header ── */}
      <div className="ev-header">
        <h1 className="ev-title">Events</h1>
        <p className="ev-sub">All events and their ticket sales performance</p>
      </div>

      {/* ── Stats ── */}
      <div className="ev-stats">
        <div className="ev-stat">
          <div className="ev-stat-label">Total Events</div>
          <div className="ev-stat-value">{stats.totalEvents}</div>
        </div>
        <div className="ev-stat">
          <div className="ev-stat-label">Active</div>
          <div className="ev-stat-value green">{stats.activeEvents}</div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="ev-table-wrap">

        {/* Toolbar */}
        <div className="ev-toolbar">
          <input
            className="ev-input ev-search"
            placeholder="Search event, venue, ID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            className="ev-input"
            value={statusF}
            onChange={(e) => setStatusF(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <span className="ev-count">
            {filtered.length} / {rows.length} events
          </span>

          <div className="ev-ml-auto">
            <button className="ev-btn" onClick={handleExportCSV}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="ev-scroll">
          <table className="ev-tbl">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort("title")}>
                  Event <SortIcon k="title" />
                </th>
                <th className="sortable" onClick={() => handleSort("date")}>
                  Date <SortIcon k="date" />
                </th>
                <th>Venue</th>
                <th>Status</th>
                <th>Ticket Types</th>
                <th className="sortable" style={{ textAlign: "center" }} onClick={() => handleSort("totalTicketsSold")}>
                  Tickets Sold <SortIcon k="totalTicketsSold" />
                </th>
                <th className="sortable" style={{ textAlign: "right" }} onClick={() => handleSort("totalRevenue")}>
                  Revenue <SortIcon k="totalRevenue" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="ev-empty">
                      <p>No events match your search</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id}>

                    {/* Event name + ID */}
                    <td>
                      <Link href={`/events/${row.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="ev-cell-title">{row.title}</div>
                        <div className="ev-cell-id">{row.id.slice(0, 12)}…</div>
                      </Link>
                    </td>

                    {/* Date */}
                    <td style={{ fontSize: 12 }}>{formatDate(row.date)}</td>

                    {/* Venue */}
                    <td style={{ fontSize: 12 }}>
                      {row.venueName || <span className="ev-cell-dim">—</span>}
                    </td>

                    {/* Status badge */}
                    <td>
                      <span className={`ev-badge ${row.status === "active" ? "ev-badge-green" : "ev-badge-muted"}`}>
                        {row.status}
                      </span>
                    </td>

                    {/* Ticket types */}
                    <td>
                      {Object.keys(row.ticketTypes).length === 0
                        ? <span className="ev-cell-dim">—</span>
                        : Object.entries(row.ticketTypes).map(([name, info]) => (
                          <div key={name} className="ev-ttype">
                            {name}
                            <span style={{ color: "rgba(201,185,122,0.6)", marginLeft: 4 }}>
                              {inr(info.price)}
                            </span>
                            {info.capacity != null && (
                              <span style={{ marginLeft: 4, opacity: 0.45 }}>
                                cap {info.capacity}
                              </span>
                            )}
                          </div>
                        ))
                      }
                    </td>

                    {/* Tickets sold */}
                    <td style={{ textAlign: "center" }}>
                      <span className="ev-cell-mono">{row.totalTicketsSold}</span>
                    </td>

                    {/* Revenue */}
                    <td style={{ textAlign: "right" }}>
                      {row.totalRevenue > 0
                        ? <span className="ev-cell-gold">{inr(row.totalRevenue)}</span>
                        : <span className="ev-cell-dim">—</span>
                      }
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
