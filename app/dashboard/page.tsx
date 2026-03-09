// app/dashboard/page.tsx
//
// FINANCIAL MODEL:
//   cashfreeFee         = 1.9% × grandTotal          (cost on every completed payment)
//   commission          = ₹50 × passQty              (confirmed passes only — ₹0 for cancelled)
//   cancellationEarning = 10% × grandTotal            (only if cancelled)
//   netProfit           = commission + cancellationEarning − cashfreeFee

import { getDb }       from "@/lib/firebase";
import { requireAuth } from "@/lib/auth";
import { BookingDoc, EventDoc, TicketLine } from "@/types";
import { Timestamp }   from "firebase-admin/firestore";
import DashboardClient from "./DashboardClient";

const COMMISSION_PER_PASS   = 50;
const CASHFREE_RATE         = 0.019;
const CANCELLATION_FEE_RATE = 0.10;

function toIso(t: Timestamp | null | undefined): string | undefined {
  return t ? t.toDate().toISOString() : undefined;
}
function r2(n: number): number {
  return parseFloat(n.toFixed(2));
}
function safeQty(tickets: TicketLine[]): number {
  return (tickets ?? []).reduce((s, t) => s + (Number(t.quantity) || 0), 0);
}

export default async function DashboardPage() {
  await requireAuth();
  const db = getDb();

  const [bookingsSnap, eventsSnap] = await Promise.all([
    db.collection("bookings").orderBy("createdAt", "desc").get(),
    db.collection("events").get(),
  ]);

  const eventTitleMap: Record<string, string> = {};
  eventsSnap.docs.forEach((d) => {
    eventTitleMap[d.id] = (d.data() as EventDoc).title ?? d.id;
  });

  type PB = {
    bookingId: string; eventId: string; eventTitle: string;
    paymentStatus: string; ticketStatus: string;
    isPaid: boolean; isCancelled: boolean;
    grandTotal: number; passQty: number;
    cashfreeFee: number; commission: number;
    cancellationEarning: number; netProfit: number;
    ticketLines: TicketLine[]; paymentMethod: string;
    createdAt: string; paidAt?: string; notificationSentAt?: string;
  };

  const all: PB[] = bookingsSnap.docs.map((doc) => {
    const b             = doc.data() as BookingDoc;
    const paymentStatus = b.paymentStatus ?? "pending";
    const ticketStatus  = b.ticketStatus  ?? "pending";
    const isPaid        = paymentStatus === "completed";
    const isCancelled   = isPaid && ticketStatus === "cancelled";
    const grandTotal    = Number(b.pricing?.grandTotal) || 0;

    // passes: 0 for cancelled (no active tickets) and 0 for unpaid
    const passQty             = isPaid && !isCancelled ? safeQty(b.tickets) : 0;
    const cashfreeFee         = isPaid ? r2(grandTotal * CASHFREE_RATE) : 0;
    // commission = ₹50 × confirmed passes only; cancelled bookings earn ₹0 commission
    const commission          = isCancelled ? 0 : passQty * COMMISSION_PER_PASS;
    const cancellationEarning = isCancelled ? r2(grandTotal * CANCELLATION_FEE_RATE) : 0;
    const netProfit           = isPaid ? r2(commission + cancellationEarning - cashfreeFee) : 0;

    return {
      bookingId:  doc.id,
      eventId:    b.eventId ?? "",
      eventTitle: eventTitleMap[b.eventId] ?? "Unknown Event",
      paymentStatus, ticketStatus, isPaid, isCancelled,
      grandTotal, passQty, cashfreeFee, commission,
      cancellationEarning, netProfit,
      ticketLines:   b.tickets ?? [],
      paymentMethod: b.paymentMethod || "Unknown",
      createdAt:     toIso(b.createdAt) ?? new Date().toISOString(),
      paidAt:        toIso(b.paidAt),
      notificationSentAt: toIso(b.notificationSentAt),
    };
  });

  const paid      = all.filter((b) => b.paymentStatus === "completed");
  const pending   = all.filter((b) => b.paymentStatus === "pending");
  const failed    = all.filter((b) => b.paymentStatus === "failed");
  const cancelled = all.filter((b) => b.isCancelled);
  const confirmed = paid.filter((b) => !b.isCancelled);

  const totalGMV              = paid.reduce((s, b) => s + b.grandTotal, 0);
  const totalCashfreeFee      = r2(paid.reduce((s, b) => s + b.cashfreeFee, 0));
  const totalCommission       = r2(confirmed.reduce((s, b) => s + b.commission, 0));
  const totalCancellationEarn = r2(cancelled.reduce((s, b) => s + b.cancellationEarning, 0));
  const totalNetProfit        = r2(totalCommission + totalCancellationEarn - totalCashfreeFee);
  const totalPassesSold       = confirmed.reduce((s, b) => s + b.passQty, 0);

  // Pass type breakdown — confirmed only
  const ptMap: Record<string, { qty: number; revenue: number }> = {};
  confirmed.forEach((b) => {
    b.ticketLines.forEach((t) => {
      const name = t.name?.trim() || "Unknown";
      if (!ptMap[name]) ptMap[name] = { qty: 0, revenue: 0 };
      ptMap[name].qty     += Number(t.quantity) || 0;
      ptMap[name].revenue += Number(t.lineTotal) || 0;
    });
  });
  const passTypes = Object.entries(ptMap)
    .map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue }))
    .sort((a, b) => b.qty - a.qty);

  // Per-event
  type EvStat = {
    id: string; title: string; revenue: number; bookings: number; passes: number;
    commission: number; cashfreeFee: number; cancellationEarning: number;
    netProfit: number; cancelledCount: number;
  };
  const evMap: Record<string, EvStat> = {};
  paid.forEach((b) => {
    if (!b.eventId) return;
    if (!evMap[b.eventId]) evMap[b.eventId] = {
      id: b.eventId, title: b.eventTitle,
      revenue: 0, bookings: 0, passes: 0,
      commission: 0, cashfreeFee: 0, cancellationEarning: 0,
      netProfit: 0, cancelledCount: 0,
    };
    const e = evMap[b.eventId];
    e.revenue             += b.grandTotal;
    e.bookings            += 1;
    e.passes              += b.passQty;
    e.commission          += b.commission;
    e.cashfreeFee         += b.cashfreeFee;
    e.cancellationEarning += b.cancellationEarning;
    e.netProfit           += b.netProfit;
    if (b.isCancelled) e.cancelledCount += 1;
  });
  const topEvents = Object.values(evMap)
    .sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // 30-day daily chart
  const now   = new Date();
  const ago30 = new Date(now.getTime() - 30 * 86400000);
  const dayMap: Record<string, {
    bookings: number; passes: number; revenue: number; profit: number; cancelled: number;
  }> = {};
  for (let i = 29; i >= 0; i--) {
    dayMap[new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10)] =
      { bookings: 0, passes: 0, revenue: 0, profit: 0, cancelled: 0 };
  }
  paid.forEach((b) => {
    const d = new Date(b.paidAt ?? b.createdAt);
    if (d < ago30) return;
    const k = d.toISOString().slice(0, 10);
    if (!dayMap[k]) return;
    dayMap[k].bookings  += 1;
    dayMap[k].passes    += b.passQty;
    dayMap[k].revenue   += b.grandTotal;
    dayMap[k].profit    += b.netProfit;
    if (b.isCancelled) dayMap[k].cancelled += 1;
  });
  const dailyData = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, ...d }));

  // Payment methods
  const mMap: Record<string, number> = {};
  paid.forEach((b) => { mMap[b.paymentMethod] = (mMap[b.paymentMethod] ?? 0) + 1; });
  const paymentMethods = Object.entries(mMap)
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count);

  const emailsSent    = confirmed.filter((b) => !!b.notificationSentAt).length;
  const emailsPending = confirmed.length - emailsSent;

  const recentBookings = paid.slice(0, 15).map((b) => ({
    bookingId:           b.bookingId,
    eventTitle:          b.eventTitle,
    grandTotal:          b.grandTotal,
    passes:              b.passQty,
    ticketSummary:       b.ticketLines.map((t) => `${t.name} ×${t.quantity}`).join(" · "),
    commission:          b.commission,
    cashfreeFee:         b.cashfreeFee,
    cancellationEarning: b.cancellationEarning,
    netProfit:           b.netProfit,
    isCancelled:         b.isCancelled,
    createdAt:           b.createdAt,
  }));

  return (
    <DashboardClient
      financial={{
        totalGMV,
        totalCommission,
        totalCashfreeFee,
        totalCancellationEarn,
        totalNetProfit,
        commissionPerPass:     COMMISSION_PER_PASS,
        cashfreeRatePct:       CASHFREE_RATE * 100,
        cancellationFeePct:    CANCELLATION_FEE_RATE * 100,
        avgCashfreePerBooking: paid.length > 0 ? r2(totalCashfreeFee / paid.length) : 0,
        avgNetPerBooking:      paid.length > 0 ? r2(totalNetProfit    / paid.length) : 0,
        totalPassesSold,
      }}
      counts={{
        total:          all.length,
        paid:           paid.length,
        confirmed:      confirmed.length,
        cancelled:      cancelled.length,
        pending:        pending.length,
        failed:         failed.length,
        totalPassesSold,
        emailsSent,
        emailsPending,
      }}
      passTypes={passTypes}
      topEvents={topEvents}
      dailyData={dailyData}
      paymentMethods={paymentMethods}
      recentBookings={recentBookings}
    />
  );
}