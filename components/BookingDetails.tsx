"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookingRow } from "@/types";

type Booking = Omit<BookingRow, "eventTitle" | "userName" | "userEmail" | "userPhone">;
type User  = { name: string; email: string; phone: string; nationality?: string; state?: string } | null;
type Event = { id: string; title: string; venueName: string; date?: string; status: string } | null;

function formatDateTime(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function paymentBadge(s: string) {
  if (s === "completed") return <span className="badge badge-green">Paid</span>;
  if (s === "failed")    return <span className="badge badge-red">Failed</span>;
  return <span className="badge badge-amber">Pending</span>;
}
function ticketBadge(s: string) {
  if (s === "confirmed")  return <span className="badge badge-green">Confirmed</span>;
  if (s === "cancelled")  return <span className="badge badge-red">Cancelled</span>;
  return <span className="badge badge-muted">Pending</span>;
}

export default function BookingDetailClient({
  booking, user, event,
}: {
  booking: Booking;
  user: User;
  event: Event;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"cancel" | "resend" | null>(null);
  const [toast, setToast]     = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [cancelled, setCancelled] = useState(booking.ticketStatus === "cancelled");

  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  async function handleCancel() {
    if (!confirm(`Cancel booking ${booking.bookingId}? This cannot be undone.`)) return;
    setLoading("cancel");
    try {
      const res = await fetch("/api/actions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.bookingId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setCancelled(true);
      showToast("Booking cancelled successfully");
      router.refresh();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error cancelling booking", "err");
    } finally {
      setLoading(null);
    }
  }

  async function handleResend() {
    setLoading("resend");
    try {
      const res = await fetch("/api/actions/resend-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.bookingId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      showToast("Ticket email sent successfully");
      router.refresh();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Error sending email", "err");
    } finally {
      setLoading(null);
    }
  }

  const grandTotal = booking.pricing?.grandTotal ?? 0;

  return (
    <>
      <Link href="/bookings" className="back-link">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        All Bookings
      </Link>

      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ fontFamily: "monospace", fontSize: 20 }}>
            {booking.bookingId}
          </h1>
          <p className="page-sub">Created {formatDateTime(booking.createdAt)}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn btn-green"
            onClick={handleResend}
            disabled={!!loading || booking.paymentStatus !== "completed"}
          >
            {loading === "resend" ? "Sending…" : "Resend Ticket Email"}
          </button>
          <button
            className="btn btn-red"
            onClick={handleCancel}
            disabled={!!loading || cancelled || booking.paymentStatus !== "completed"}
          >
            {loading === "cancel" ? "Cancelling…" : cancelled ? "Cancelled" : "Cancel Booking"}
          </button>
        </div>
      </div>

      <div className="detail-grid">
        {/* Payment info */}
        <div className="detail-card">
          <div className="detail-card-title">Payment</div>
          <div className="detail-row">
            <span className="detail-row-label">Status</span>
            <span className="detail-row-value">{paymentBadge(booking.paymentStatus)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Ticket Status</span>
            <span className="detail-row-value">{ticketBadge(cancelled ? "cancelled" : booking.ticketStatus)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Grand Total</span>
            <span className="detail-row-value" style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--gold)" }}>
              ₹{grandTotal.toLocaleString("en-IN")}
            </span>
          </div>
          {booking.pricing && (
            <>
              <div className="divider" style={{ margin: "12px 0" }} />
              <div className="detail-row">
                <span className="detail-row-label">Subtotal</span>
                <span className="detail-row-value">₹{booking.pricing.subtotal?.toLocaleString("en-IN")}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Convenience Fee</span>
                <span className="detail-row-value">₹{booking.pricing.convenienceFee?.toLocaleString("en-IN")}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">GST</span>
                <span className="detail-row-value">₹{booking.pricing.gst?.toLocaleString("en-IN")}</span>
              </div>
            </>
          )}
          {booking.cashfreeOrderId && (
            <>
              <div className="divider" style={{ margin: "12px 0" }} />
              <div className="detail-row">
                <span className="detail-row-label">Cashfree Order ID</span>
                <span className="detail-row-value text-mono" style={{ fontSize: 12 }}>{booking.cashfreeOrderId}</span>
              </div>
            </>
          )}
          {booking.paymentMethod && (
            <div className="detail-row">
              <span className="detail-row-label">Payment Method</span>
              <span className="detail-row-value">{booking.paymentMethod}</span>
            </div>
          )}
          <div className="detail-row">
            <span className="detail-row-label">Paid At</span>
            <span className="detail-row-value">{formatDateTime(booking.paidAt)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Email Sent</span>
            <span className="detail-row-value">
              {booking.notificationSentAt
                ? formatDateTime(booking.notificationSentAt)
                : <span className="badge badge-muted">Not sent</span>}
            </span>
          </div>
        </div>

        {/* Attendee */}
        <div className="detail-card">
          <div className="detail-card-title">Attendee</div>
          {user ? (
            <>
              <div className="detail-row">
                <span className="detail-row-label">Name</span>
                <span className="detail-row-value">{user.name || "—"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Email</span>
                <span className="detail-row-value">{user.email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Phone</span>
                <span className="detail-row-value">{user.phone}</span>
              </div>
              {user.nationality && (
                <div className="detail-row">
                  <span className="detail-row-label">Nationality</span>
                  <span className="detail-row-value">{user.nationality}</span>
                </div>
              )}
              {user.state && (
                <div className="detail-row">
                  <span className="detail-row-label">State</span>
                  <span className="detail-row-value">{user.state}</span>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: "var(--text-3)", fontSize: 13 }}>
              User ID: <code>{booking.userId}</code>
            </p>
          )}

          <div className="divider" style={{ margin: "16px 0" }} />

          <div className="detail-card-title">Event</div>
          {event ? (
            <>
              <div className="detail-row">
                <span className="detail-row-label">Title</span>
                <span className="detail-row-value">{event.title}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Venue</span>
                <span className="detail-row-value">{event.venueName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Date</span>
                <span className="detail-row-value">{formatDateTime(event.date)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Status</span>
                <span className="detail-row-value">
                  <span className={`badge ${event.status === "active" ? "badge-green" : "badge-muted"}`}>
                    {event.status}
                  </span>
                </span>
              </div>
            </>
          ) : (
            <p style={{ color: "var(--text-3)", fontSize: 13 }}>
              Event ID: <code>{booking.eventId}</code>
            </p>
          )}
        </div>
      </div>

      {/* Tickets breakdown */}
      <div className="table-wrap">
        <div className="table-toolbar">
          <span style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-3)" }}>
            Ticket Breakdown
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Unit Price</th>
              <th>Qty</th>
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {booking.tickets.map((t, i) => (
              <tr key={i}>
                <td className="td-name">{t.name}</td>
                <td>₹{t.price.toLocaleString("en-IN")}</td>
                <td>{t.quantity}</td>
                <td className="td-amount">₹{t.lineTotal.toLocaleString("en-IN")}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} style={{ textAlign: "right", fontWeight: 600, color: "var(--text-3)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Grand Total
              </td>
              <td className="td-amount" style={{ color: "var(--gold)" }}>
                ₹{grandTotal.toLocaleString("en-IN")}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {toast && (
        <div className="toast-wrap">
          <div className={`toast${toast.type === "err" ? " error" : ""}`}>{toast.msg}</div>
        </div>
      )}
    </>
  );
}
