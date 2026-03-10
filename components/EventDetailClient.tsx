"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { BookingRow } from "@/types";

interface TicketTypeInfo { price: number; capacity?: number; }

interface Event {
  id: string;
  title: string;
  date?: string;
  venueName: string;
  status: string;
  ticketTypes: Record<string, TicketTypeInfo>;
  createdAt?: string;
  updatedAt?: string;
}

interface EventStats {
  totalTicketsSold: number;
  totalRevenue: number;
  scannedCount: number;
}

export default function EventDetailClient({
  event,
  stats,
  bookings,
  users,
}: {
  event: Event;
  stats: EventStats;
  bookings: BookingRow[];
  users: Record<string, any>;
}) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scannedFilter, setScannedFilter] = useState("all");

  // Filter bookings
  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    // Text search
    if (q.trim()) {
      const lower = q.toLowerCase();
      filtered = filtered.filter(
        (booking) =>
          booking.userName?.toLowerCase().includes(lower) ||
          booking.userEmail?.toLowerCase().includes(lower) ||
          booking.bookingId.toLowerCase().includes(lower)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((booking) => booking.ticketStatus === statusFilter);
    }

    // Scanned filter
    if (scannedFilter === "scanned") {
      filtered = filtered.filter((booking) => booking.scannedAt);
    } else if (scannedFilter === "not-scanned") {
      filtered = filtered.filter((booking) => !booking.scannedAt);
    }

    return filtered;
  }, [bookings, q, statusFilter, scannedFilter]);

  function formatDateTime(iso: string | undefined) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }

  function formatDate(iso: string | undefined) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  }

  function paymentBadge(status: string) {
    if (status === "completed") return <span className="badge badge-green">Paid</span>;
    if (status === "failed") return <span className="badge badge-red">Failed</span>;
    return <span className="badge badge-amber">Pending</span>;
  }

  function ticketBadge(status: string) {
    if (status === "confirmed") return <span className="badge badge-green">Confirmed</span>;
    if (status === "cancelled") return <span className="badge badge-red">Cancelled</span>;
    return <span className="badge badge-muted">Pending</span>;
  }

  function scannedBadge(scannedAt: string | undefined) {
    if (scannedAt) {
      return <span className="badge badge-gold">Scanned</span>;
    }
    return <span className="badge badge-muted">Not scanned</span>;
  }

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

        .badge { display: inline-flex; align-items: center; padding: 3px 8px; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }
        .badge-green { background: var(--greendim); color: var(--green); }
        .badge-red { background: rgba(239,68,68,0.12); color: #ef4444; }
        .badge-amber { background: rgba(245,158,11,0.12); color: #f59e0b; }
        .badge-gold { background: var(--golddim); color: var(--gold); }
        .badge-muted { background: var(--muted-dim); color: var(--text3); }

        .page-header { margin-bottom: 24px; }
        .page-title { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 0.04em; color: var(--text); line-height: 1; }
        .page-sub { font-size: 13px; color: var(--text2); margin-top: 6px; font-weight: 300; }

        .back-link { display: inline-flex; align-items: center; gap: 6px; color: var(--text2); text-decoration: none; font-size: 12px; margin-bottom: 16px; transition: color 0.15s; }
        .back-link:hover { color: var(--text); }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); margin-bottom: 24px; }
        .stat-card { background: var(--surf); padding: 20px; text-align: center; }
        .stat-label { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text3); margin-bottom: 8px; }
        .stat-value { font-family: 'Bebas Neue', sans-serif; font-size: 32px; letter-spacing: 0.02em; color: var(--text); line-height: 1; }
        .stat-value.gold { color: var(--gold); }
        .stat-value.green { color: var(--green); }

        .table-wrap { background: var(--surf); border: 1px solid var(--border); overflow: hidden; }
        .table-toolbar { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
        .input { background: var(--surf2); border: 1px solid var(--border); color: var(--text); padding: 0 12px; font-family: 'DM Sans', sans-serif; font-size: 13px; outline: none; height: 34px; transition: border-color 0.15s; }
        .input:focus { border-color: rgba(201,185,122,0.4); }
        .input::placeholder { color: var(--text3); }
        select.input { min-width: 140px; cursor: pointer; }

        .table-scroll { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; font-family: 'DM Sans', sans-serif; }
        table thead tr { border-bottom: 1px solid var(--border); }
        table th { padding: 10px 14px; text-align: left; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text3); font-weight: 600; white-space: nowrap; }
        table td { padding: 11px 14px; font-size: 13px; color: var(--text2); border-bottom: 1px solid rgba(255,255,255,0.035); vertical-align: middle; }
        table tr:last-child td { border-bottom: none; }
        table tbody tr:hover td { background: rgba(255,255,255,0.018); color: var(--text); }

        .td-name { font-weight: 500; color: var(--text); }
        .td-amount { font-family: 'Bebas Neue', sans-serif; font-size: 15px; color: var(--gold); letter-spacing: 0.02em; }
        .td-id { font-family: monospace; font-size: 11px; color: var(--text3); }

        .empty-state { padding: 56px 20px; text-align: center; }
        .empty-state p { font-size: 13px; color: var(--text3); }

        /* ── Mobile Responsive ── */
        @media (max-width: 768px) {
          .back-link { font-size: 11px; margin-bottom: 12px; }
          
          .page-title { font-size: 24px; }
          .page-sub { font-size: 12px; }
          
          .stats-grid { grid-template-columns: 1fr 1fr; gap: 1px; }
          .stat-card { padding: 16px 12px; }
          .stat-label { font-size: 9px; }
          .stat-value { font-size: 24px; }
          
          .table-toolbar { padding: 8px 12px; gap: 8px; flex-wrap: wrap; }
          .input { font-size: 12px; height: 32px; padding: 0 8px; }
          .input:first-child { min-width: 160px; flex: 1; }
          select.input { min-width: 120px; }
          
          table th { padding: 8px 6px; font-size: 9px; }
          table td { padding: 8px 6px; font-size: 12px; }
          .td-name { font-size: 12px; }
          .td-amount { font-size: 13px; }
          .td-id { font-size: 9px; }
          .badge { font-size: 9px; padding: 2px 6px; }
        }

        @media (max-width: 480px) {
          .back-link { font-size: 10px; }
          
          .page-title { font-size: 20px; }
          .page-sub { font-size: 11px; }
          
          .stats-grid { grid-template-columns: 1fr; }
          .stat-card { padding: 14px 12px; }
          .stat-value { font-size: 20px; }
          
          .table-toolbar { flex-direction: column; align-items: stretch; }
          .input { min-width: 100%; }
          
          table th { padding: 6px 4px; font-size: 8px; }
          table td { padding: 6px 4px; font-size: 11px; }
          .td-name { font-size: 11px; }
          .td-amount { font-size: 12px; }
          .td-id { font-size: 8px; }
          .badge { font-size: 8px; padding: 1px 4px; }
          
          /* Hide some columns on very small screens */
          table th:nth-child(7),
          table td:nth-child(7) { display: none; } /* Hide Gate Scan column */
        }
      `}</style>

      <Link href="/events" className="back-link">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        All Events
      </Link>

      <div className="page-header">
        <h1 className="page-title">{event.title}</h1>
        <p className="page-sub">
          {formatDate(event.date)} · {event.venueName}
        </p>
      </div>

      {/* Event Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Tickets Sold</div>
          <div className="stat-value">{stats.totalTicketsSold}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value gold">₹{stats.totalRevenue.toLocaleString("en-IN")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tickets Scanned</div>
          <div className="stat-value green">{stats.scannedCount}</div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="table-wrap">
        <div className="table-toolbar">
          <input
            className="input"
            placeholder="Search name, email, booking ID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 220 }}
          />

          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            className="input"
            value={scannedFilter}
            onChange={(e) => setScannedFilter(e.target.value)}
          >
            <option value="all">All scan states</option>
            <option value="scanned">Scanned ✓</option>
            <option value="not-scanned">Not scanned yet</option>
          </select>

          <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--text3)" }}>
            {filteredBookings.length} / {bookings.length} bookings
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Attendee</th>
                <th>Tickets</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Gate Scan</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <p>No bookings found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.bookingId}>
                    <td className="td-id">{booking.bookingId.slice(0, 8)}…</td>
                    <td>
                      <div className="td-name">{booking.userName || "—"}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
                        {booking.userEmail}
                      </div>
                    </td>
                    <td>
                      {booking.tickets.map((ticket, i) => (
                        <div key={i} style={{ fontSize: 12 }}>
                          {ticket.name} × {ticket.quantity}
                        </div>
                      ))}
                    </td>
                    <td className="td-amount">
                      ₹{booking.pricing.grandTotal.toLocaleString("en-IN")}
                    </td>
                    <td>{paymentBadge(booking.paymentStatus)}</td>
                    <td>{scannedBadge(booking.scannedAt)}</td>
                    <td style={{ fontSize: 12, color: "var(--text3)" }}>
                      {formatDateTime(booking.createdAt)}
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
