// app/events/page.tsx
// Server component — fetches events + booking revenue from Firestore,
// then hands serialized data to the client table below.

import { getDb } from "@/lib/firebase";
import { requireAuth } from "@/lib/auth";
import { EventDoc, BookingDoc } from "@/types";
import { Timestamp } from "firebase-admin/firestore";
import EventsTableClient from '../../components/EventTableClient';

function tsToIso(ts: Timestamp | undefined | null): string | undefined {
  if (!ts) return undefined;
  return ts.toDate().toISOString();
}

export default async function EventsPage() {
  await requireAuth();
  const db = getDb();

  // Fetch events + all completed bookings in parallel
  const [eventsSnap, bookingsSnap] = await Promise.all([
    db.collection("events").orderBy("createdAt", "desc").get(),
    db.collection("bookings").where("paymentStatus", "==", "completed").get(),
  ]);

  // Aggregate per-event revenue / tickets sold / booking count
  const revenueMap: Record<string, { revenue: number; tickets: number; bookings: number }> = {};
  bookingsSnap.docs.forEach((d) => {
    const b = d.data() as BookingDoc;
    if (!b.eventId) return;
    if (!revenueMap[b.eventId]) revenueMap[b.eventId] = { revenue: 0, tickets: 0, bookings: 0 };
    revenueMap[b.eventId].revenue  += b.pricing?.grandTotal ?? 0;
    revenueMap[b.eventId].tickets  += (b.tickets ?? []).reduce((s, t) => s + t.quantity, 0);
    revenueMap[b.eventId].bookings += 1;
  });

  // Serialize to plain objects (no Timestamps, no Firestore internals)
  const rows = eventsSnap.docs.map((doc) => {
    const e   = doc.data() as EventDoc;
    const rev = revenueMap[doc.id] ?? { revenue: 0, tickets: 0, bookings: 0 };
    return {
      id:               doc.id,
      title:            e.title        ?? "Untitled",
      date:             tsToIso(e.date),
      venueName:        e.venueName    ?? "",
      status:           e.status       ?? "inactive",
      ticketTypes:      e.ticketTypes  ?? {},
      totalBookings:    rev.bookings,
      totalRevenue:     rev.revenue - (rev.tickets * 50),
      totalTicketsSold: rev.tickets,
    };
  });

  const stats = {
    totalEvents:      rows.length,
    activeEvents:     rows.filter((r) => r.status === "active").length,
    totalRevenue:     rows.reduce((s, r) => s + r.totalRevenue, 0),
    totalTicketsSold: rows.reduce((s, r) => s + r.totalTicketsSold, 0),
  };

  return <EventsTableClient rows={rows} stats={stats} />;
}
