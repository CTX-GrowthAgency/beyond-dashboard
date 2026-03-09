"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookingRow, DashboardStats } from "@/types";

function formatDateTime(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}
function paymentBadge(status: string) {
  if (status === "completed") return <span className="badge badge-green">Paid</span>;
  if (status === "failed")    return <span className="badge badge-red">Failed</span>;
  return <span className="badge badge-amber">Pending</span>;
}
function ticketBadge(status: string) {
  if (status === "confirmed") return <span className="badge badge-green">Confirmed</span>;
  if (status === "cancelled") return <span className="badge badge-red">Cancelled</span>;
  return <span className="badge badge-muted">Pending</span>;
}
function scannedBadge(scannedAt: string | undefined, scannedBy: string | undefined) {
  if (scannedAt) {
    return (
      <div>
        <span className="badge badge-gold">Scanned</span>
        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3, lineHeight: 1.4 }}>
          {formatDateTime(scannedAt)}
          {scannedBy && (
            <span style={{ display: "block", opacity: 0.7 }}>{scannedBy}</span>
          )}
        </div>
      </div>
    );
  }
  return <span className="badge badge-muted">Not scanned</span>;
}

export default function BookingTable({
  rows,
  stats,
  eventOptions,
  initialStatus,
  initialEvent,
  initialQ,
  initialScanned,
}: {
  rows: BookingRow[];
  stats: DashboardStats;
  eventOptions: { id: string; title: string }[];
  initialStatus: string;
  initialEvent: string;
  initialQ: string;
  initialScanned: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [q,       setQ]       = useState(initialQ);
  const [status,  setStatus]  = useState(initialStatus);
  const [event,   setEvent]   = useState(initialEvent);
  const [scanned, setScanned] = useState(initialScanned);
  const [toast,   setToast]   = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  function applyFilters(
    newStatus?: string,
    newEvent?: string,
    newScanned?: string,
  ) {
    const s  = newStatus  ?? status;
    const e  = newEvent   ?? event;
    const sc = newScanned ?? scanned;
    const params = new URLSearchParams();
    if (s  && s  !== "all") params.set("status",  s);
    if (e  && e  !== "all") params.set("event",   e);
    if (sc && sc !== "all") params.set("scanned", sc);
    if (q) params.set("q", q);
    startTransition(() => router.push(`/bookings?${params.toString()}`));
  }

  async function handleExportCSV() {
    const params = new URLSearchParams();
    if (status  !== "all") params.set("status", status);
    if (event   !== "all") params.set("event",  event);
    if (scanned !== "all") params.set("scanned", scanned);
    const res = await fetch(`/api/actions/export-csv?${params.toString()}`);
    if (!res.ok) { showToast("Export failed", "err"); return; }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `beyond-bookings-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV downloaded");
  }

  // Scan rate percentage
  const scanBase  = stats.scannedCount + stats.notScannedCount;
  const scanRate  = scanBase > 0 ? Math.round((stats.scannedCount / scanBase) * 100) : 0;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Bookings</h1>
        <p className="page-sub">All ticket purchases across every event</p>
      </div>

      {/* ── Stats bar ── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Bookings</div>
          <div className="stat-value">{stats.totalBookings}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Confirmed</div>
          <div className="stat-value green">{stats.confirmedBookings}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value amber">{stats.pendingBookings}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Failed</div>
          <div className="stat-value red">{stats.failedBookings}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value gold">
            ₹{stats.totalRevenue.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tickets Sold</div>
          <div className="stat-value">{stats.totalTicketsSold}</div>
        </div>

        {/* Scanned stat card */}
        <div className="stat-card" style={{ borderTop: "2px solid var(--gold)", position: "relative", overflow: "hidden" }}>
          <div className="stat-label">Scanned at Gate</div>
          <div className="stat-value gold">{stats.scannedCount}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
            {scanRate}% of confirmed
          </div>
          {/* Mini progress bar */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.06)" }}>
            <div style={{ height: "100%", width: `${scanRate}%`, background: "var(--gold)", transition: "width 0.4s" }} />
          </div>
        </div>

        {/* Not scanned stat card */}
        <div className="stat-card" style={{ borderTop: "2px solid var(--amber)", position: "relative", overflow: "hidden" }}>
          <div className="stat-label">Not Yet Scanned</div>
          <div className="stat-value amber">{stats.notScannedCount}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
            Confirmed &amp; awaiting entry
          </div>
          {/* Mini progress bar (inverse) */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.06)" }}>
            <div style={{ height: "100%", width: `${100 - scanRate}%`, background: "var(--amber)", transition: "width 0.4s" }} />
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="table-wrap">
        <div className="table-toolbar">
          {/* Search */}
          <input
            className="input"
            placeholder="Search name, email, booking ID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
            style={{ minWidth: 220 }}
          />

          {/* Payment status filter */}
          <select
            className="input"
            value={status}
            onChange={(e) => { setStatus(e.target.value); applyFilters(e.target.value); }}
          >
            <option value="all">All statuses</option>
            <option value="completed">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>

          {/* Event filter */}
          <select
            className="input"
            value={event}
            onChange={(e) => { setEvent(e.target.value); applyFilters(undefined, e.target.value); }}
          >
            <option value="all">All events</option>
            {eventOptions.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>

          {/* Scanned filter */}
          <select
            className="input"
            value={scanned}
            onChange={(e) => { setScanned(e.target.value); applyFilters(undefined, undefined, e.target.value); }}
          >
            <option value="all">All scan states</option>
            <option value="yes">Scanned ✓</option>
            <option value="no">Not scanned yet</option>
          </select>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => applyFilters()} disabled={isPending}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Refresh
            </button>
            <button className="btn btn-ghost" onClick={handleExportCSV}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Attendee</th>
                <th>Event</th>
                <th>Tickets</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Email Sent</th>
                <th>Gate Scan</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <div className="empty-state">
                      <p>No bookings found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.bookingId}>
                    <td className="td-id">{row.bookingId.slice(0, 8)}…</td>
                    <td>
                      <div className="td-name">{row.userName ?? "—"}</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                        {row.userEmail}
                      </div>
                    </td>
                    <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {row.eventTitle ?? row.eventId}
                    </td>
                    <td>
                      {row.tickets.map((t, i) => (
                        <div key={i} style={{ fontSize: 12 }}>
                          {t.name} × {t.quantity}
                        </div>
                      ))}
                    </td>
                    <td className="td-amount">
                      ₹{(row.pricing?.grandTotal ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td>{paymentBadge(row.paymentStatus)}</td>
                    <td>{ticketBadge(row.ticketStatus)}</td>
                    <td>
                      {row.notificationSentAt
                        ? <span className="badge badge-green">Sent</span>
                        : <span className="badge badge-muted">No</span>}
                    </td>
                    <td>{scannedBadge(row.scannedAt, row.scannedBy)}</td>
                    <td style={{ fontSize: 12, color: "var(--text-3)" }}>
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td>
                      <Link href={`/bookings/${row.bookingId}`} className="btn btn-ghost" style={{ fontSize: 11 }}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-wrap">
          <div className={`toast${toast.type === "err" ? " error" : ""}`}>{toast.msg}</div>
        </div>
      )}
    </>
  );
}