import { getDb } from "@/lib/firebase";
import { requireAuth } from "@/lib/auth";
import { EventDoc, BookingDoc, UserDoc } from "@/types";
import { Timestamp } from "firebase-admin/firestore";
import { getCachedData } from "@/lib/cache";
import EventDetailClient from '@/components/EventDetailClient';
import { notFound } from 'next/navigation';

function tsToIso(ts: Timestamp | undefined | null): string | undefined {
  if (!ts) return undefined;
  return ts.toDate().toISOString();
}

export default async function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
  try {
    await requireAuth();
    const { eventId } = await params;
    
    if (!eventId) {
      notFound();
    }
    
    const db = getDb();

    // Fetch event details (single document read)
    const eventSnap = await db.collection("events").doc(eventId).get();
    if (!eventSnap.exists) {
      notFound();
    }
    const event = eventSnap.data() as EventDoc;

    // Get cached event-specific stats
    const eventStats = await getCachedData(`event_stats_${eventId}`, async () => {
      try {
        // Use composite index: eventId + paymentStatus + createdAt
        const bookingsSnap = await db
          .collection("bookings")
          .where("eventId", "==", eventId)
          .where("paymentStatus", "==", "completed")
          .orderBy("createdAt", "desc")
          .limit(500) // Limit for performance
          .get();

        const bookings = bookingsSnap.docs.map(doc => ({
          bookingId: doc.id,
          ...doc.data() as Omit<BookingDoc, 'bookingId'>
        }));

        // Calculate stats with proper error handling
        const totalRevenue = bookings.reduce((sum: number, b: any) => {
          try {
            const commission = 50 * (b.tickets?.reduce((s: number, t: any) => s + t.quantity, 0) || 0);
            return sum + ((b.pricing?.grandTotal || 0) - commission);
          } catch {
            return sum;
          }
        }, 0);

        const totalTicketsSold = bookings.reduce((sum: number, b: any) => {
          try {
            return sum + (b.tickets?.reduce((s: number, t: any) => s + t.quantity, 0) || 0);
          } catch {
            return sum;
          }
        }, 0);

        const scannedCount = bookings.filter((b: any) => b.scannedAt).length;

        return {
          totalRevenue,
          totalBookings: bookings.length,
          totalTicketsSold,
          scannedCount,
          bookings
        };
      } catch (error) {
        console.error('Error fetching event stats:', error);
        // Return default stats if query fails
        return {
          totalRevenue: 0,
          totalBookings: 0,
          totalTicketsSold: 0,
          scannedCount: 0,
          bookings: []
        };
      }
    }, 300000); // 5 minute cache

    // Batch fetch user data (only for displayed bookings)
    const userIds = [...new Set(eventStats.bookings.map(b => b.userId || b.uid).filter(Boolean))];
    const userSnaps = await Promise.all(
      userIds.length > 0 
        ? userIds.map(userId => db.collection("users").doc(userId).get())
        : [Promise.resolve({ exists: false } as any)]
    );
    
    const users: Record<string, UserDoc> = {};
    userSnaps.forEach((snap: any) => {
      try {
        if (snap.exists) {
          const userData = snap.data() as UserDoc;
          users[snap.id] = userData;
        }
      } catch (error) {
        console.error('Error processing user data:', error);
      }
    });

    // Serialize bookings for client with error handling
    const bookingRows = eventStats.bookings.map(booking => {
      try {
        return {
          bookingId: booking.bookingId,
          userId: booking.userId,
          eventId: booking.eventId,
          eventSlug: booking.eventSlug,
          tickets: booking.tickets,
          pricing: booking.pricing,
          paymentStatus: booking.paymentStatus,
          ticketStatus: booking.ticketStatus,
          createdAt: booking.createdAt?.toDate().toISOString() || new Date().toISOString(),
          paidAt: booking.paidAt?.toDate().toISOString(),
          scannedAt: booking.scannedAt?.toDate().toISOString(),
          scannedBy: booking.scannedBy,
        };
      } catch (error) {
        console.error('Error serializing booking:', error);
        return null;
      }
    }).filter((booking): booking is NonNullable<typeof booking> => Boolean(booking));

    // Serialize user data for client with error handling
    const serializedUsers: Record<string, any> = {};
    Object.keys(users).forEach(userId => {
      try {
        const user = users[userId];
        serializedUsers[userId] = {
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          nationality: user.nationality || '',
          state: user.state || '',
          createdAt: user.createdAt?.toDate().toISOString() || new Date().toISOString(),
        };
      } catch (error) {
        console.error('Error serializing user:', error);
        serializedUsers[userId] = {
          name: '',
          email: '',
          phone: '',
          nationality: '',
          state: '',
          createdAt: new Date().toISOString(),
        };
      }
    });

    return (
      <EventDetailClient
        event={{
          id: event.id,
          title: event.title || 'Unknown Event',
          date: tsToIso(event.date),
          venueName: event.venueName || 'Unknown Venue',
          status: event.status || 'unknown',
          ticketTypes: event.ticketTypes || {},
          createdAt: event.createdAt?.toDate().toISOString() || new Date().toISOString(),
          updatedAt: event.updatedAt?.toDate().toISOString() || new Date().toISOString(),
        }}
        bookings={bookingRows}
        users={serializedUsers}
        stats={{
          totalTicketsSold: eventStats.totalTicketsSold,
          totalRevenue: eventStats.totalRevenue,
          scannedCount: eventStats.scannedCount,
        }}
      />
    );
  } catch (error) {
    console.error('Event page error:', error);
    // Return a fallback page or redirect
    notFound();
  }
}
