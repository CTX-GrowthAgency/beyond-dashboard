// app/events/page.tsx
// Server component — fetches events with optimized queries and caching

import { getDb } from "@/lib/firebase";
import { requireAuth } from "@/lib/auth";
import { EventDoc, BookingDoc } from "@/types";
import { Timestamp } from "firebase-admin/firestore";
import { getCachedData } from "@/lib/cache";
import EventsTableClient from '../../components/EventTableClient';

function tsToIso(ts: Timestamp | undefined | null): string | undefined {
  if (!ts) return undefined;
  return ts.toDate().toISOString();
}

export default async function EventsPage() {
  await requireAuth();
  const db = getDb();

  // Fetch events with composite index (status + createdAt)
  const eventsSnap = await db
    .collection("events")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  
  // Get per-event stats (not global)
  const events = eventsSnap.docs.map(async (doc) => {
    const eventData = doc.data() as Omit<EventDoc, 'id'>;
    const eventId = doc.id;
    
    // Get cached stats for this specific event
    const eventStats = await getCachedData(`event_stats_${eventId}`, async () => {
      // This query uses composite index: eventId + paymentStatus + createdAt
      const eventBookings = await db
        .collection("bookings")
        .where("eventId", "==", eventId)
        .where("paymentStatus", "==", "completed")
        .orderBy("createdAt", "desc")
        .limit(500) // Limit for performance
        .get();

      const bookings = eventBookings.docs.map(doc => doc.data());
      
      return {
        totalRevenue: bookings.reduce((sum: number, b: any) => {
          const commission = 50 * (b.tickets?.reduce((s: number, t: any) => s + t.quantity, 0) || 0);
          return sum + ((b.pricing?.grandTotal || 0) - commission);
        }, 0),
        totalBookings: bookings.length,
        totalTicketsSold: bookings.reduce((sum: number, b: any) => 
          (b.tickets?.reduce((s: number, t: any) => s + t.quantity, 0) || 0), 0
        ),
        scannedCount: bookings.filter((b: any) => b.scannedAt).length,
      };
    }, 300000); // 5 minute cache

    return {
      id: eventId,
      title: eventData.title,
      date: tsToIso(eventData.date || eventData.createdAt), // Use date field or fallback to createdAt
      venueName: eventData.venueName,
      status: eventData.status,
      ticketTypes: eventData.ticketTypes,
      createdAt: eventData.createdAt.toDate().toISOString(),
      updatedAt: eventData.updatedAt.toDate().toISOString(),
      // Use per-event stats
      totalBookings: eventStats.totalBookings,
      totalRevenue: eventStats.totalRevenue,
      totalTicketsSold: eventStats.totalTicketsSold,
    };
  });

  // Wait for all event stats to be calculated
  const resolvedEvents = await Promise.all(events);

  // Calculate global stats from resolved events
  const stats = {
    totalEvents: resolvedEvents.length,
    activeEvents: resolvedEvents.length, // All fetched events are active
    totalRevenue: resolvedEvents.reduce((sum: number, event: any) => sum + event.totalRevenue, 0),
    totalTicketsSold: resolvedEvents.reduce((sum: number, event: any) => sum + event.totalTicketsSold, 0),
    scannedCount: resolvedEvents.reduce((sum: number, event: any) => sum + event.scannedCount, 0),
  };

  return <EventsTableClient rows={resolvedEvents} stats={stats} />;
}
