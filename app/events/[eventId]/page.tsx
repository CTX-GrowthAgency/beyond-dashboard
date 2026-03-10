import { getDb } from "@/lib/firebase";
import { requireAuth } from "@/lib/auth";
import { EventDoc, BookingDoc, UserDoc, BookingRow } from "@/types";
import { Timestamp } from "firebase-admin/firestore";
import EventDetailClient from "@/components/EventDetailClient";
import { notFound } from "next/navigation";

function tsToIso(ts: Timestamp | undefined | null): string | undefined {
  if (!ts) return undefined;
  return ts.toDate().toISOString();
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  await requireAuth();
  const { eventId } = await params;
  const db = getDb();

  // Fetch event details
  const eventSnap = await db.collection("events").doc(eventId).get();
  if (!eventSnap.exists) {
    notFound();
  }

  const event = eventSnap.data() as EventDoc;

  // Fetch all bookings for this event
  const bookingsSnap = await db
    .collection("bookings")
    .where("eventId", "==", eventId)
    .where("paymentStatus", "==", "completed")
    .get();

  const bookings = bookingsSnap.docs.map(doc => ({
    bookingId: doc.id,
    ...doc.data()
  })) as (BookingDoc & { bookingId: string })[];

  // Fetch user data for all bookings
  const userIds = [...new Set(bookings.map(b => b.userId || b.uid).filter(Boolean))];
  const userSnaps = await Promise.all(
    userIds.map(userId => db.collection("users").doc(userId).get())
  );
  
  const users: Record<string, UserDoc> = {};
  userSnaps.forEach(snap => {
    if (snap.exists) {
      users[snap.id] = snap.data() as UserDoc;
    }
  });

  // Calculate statistics and create BookingRow objects
  const bookingRows: BookingRow[] = bookings.map(booking => {
    const user = users[booking.userId || booking.uid];
    return {
      bookingId: booking.bookingId,
      userId: booking.userId || booking.uid,
      eventId: eventId,
      eventSlug: booking.eventSlug,
      eventTitle: event.title || "Untitled Event",
      userName: user?.name,
      userEmail: user?.email,
      userPhone: user?.phone,
      tickets: booking.tickets,
      pricing: booking.pricing,
      paymentStatus: booking.paymentStatus,
      ticketStatus: booking.ticketStatus,
      paymentMethod: booking.paymentMethod,
      cashfreeOrderId: booking.cashfreeOrderId,
      createdAt: tsToIso(booking.createdAt) || "",
      paidAt: tsToIso(booking.paidAt),
      notificationSentAt: tsToIso(booking.notificationSentAt),
      scannedAt: tsToIso(booking.scannedAt),
      scannedBy: booking.scannedBy,
    };
  });

  const totalTicketsSold = bookingRows.reduce((sum, booking) => 
    sum + booking.tickets.reduce((ticketSum, ticket) => 
      ticketSum + ticket.quantity, 0), 0);

  const totalRevenue = bookingRows.reduce((sum, booking) => 
    sum + booking.pricing.grandTotal, 0) - (totalTicketsSold * 50);

  const scannedCount = bookingRows.filter(booking => 
    booking.scannedAt
  ).length;

  const confirmedBookings = bookingRows.filter(booking => 
    booking.ticketStatus === "confirmed"
  ).length;

  return (
    <EventDetailClient
      event={{
        id: eventSnap.id,
        title: event.title || "Untitled Event",
        date: tsToIso(event.date),
        venueName: event.venueName || "",
        status: event.status || "inactive",
        ticketTypes: event.ticketTypes || {},
      }}
      stats={{
        totalTicketsSold,
        totalRevenue,
        scannedCount,
        confirmedBookings,
        totalBookings: bookingRows.length,
      }}
      bookings={bookingRows}
    />
  );
}
