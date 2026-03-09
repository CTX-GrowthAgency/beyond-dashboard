import { getDb } from "@/lib/firebase";
import { BookingDoc, UserDoc, EventDoc } from "@/types";
import { Timestamp } from "firebase-admin/firestore";
import BookingDetailClient from "@/components/BookingDetails";
import { requireAuth } from "@/lib/auth";

function tsToIso(ts: Timestamp | undefined | null) {
  if (!ts) return undefined;
  return ts.toDate().toISOString();
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  await requireAuth();
  const { bookingId } = await params;
  const db = getDb();

  const snap = await db.collection("bookings").doc(bookingId).get();
  if (!snap.exists) {
    return (
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <p>Booking <code>{bookingId}</code> not found.</p>
      </div>
    );
  }

  const data = snap.data() as BookingDoc;
  const uid  = data.userId ?? data.uid ?? "";

  const [userSnap, eventSnap] = await Promise.all([
    uid ? db.collection("users").doc(uid).get() : Promise.resolve(null),
    data.eventId ? db.collection("events").doc(data.eventId).get() : Promise.resolve(null),
  ]);

  const user  = userSnap?.exists  ? (userSnap.data()  as UserDoc)  : null;
  const event = eventSnap?.exists ? (eventSnap.data() as EventDoc) : null;

  return (
    <BookingDetailClient
      booking={{
        bookingId:          snap.id,
        userId:             uid,
        eventId:            data.eventId ?? "",
        eventSlug:          data.eventSlug ?? "",
        tickets:            data.tickets ?? [],
        pricing:            data.pricing ?? { subtotal: 0, convenienceFee: 0, gst: 0, grandTotal: 0 },
        paymentStatus:      data.paymentStatus,
        ticketStatus:       data.ticketStatus,
        paymentMethod:      data.paymentMethod,
        cashfreeOrderId:    data.cashfreeOrderId,
        createdAt:          tsToIso(data.createdAt) ?? new Date().toISOString(),
        paidAt:             tsToIso(data.paidAt),
        notificationSentAt: tsToIso(data.notificationSentAt),
      }}
      user={user ? {
        name:        user.name,
        email:       user.email,
        phone:       user.phone,
        nationality: user.nationality,
        state:       user.state,
      } : null}
      event={event ? {
        id:        eventSnap!.id,
        title:     event.title ?? "",
        venueName: event.venueName ?? "",
        date:      tsToIso(event.date),
        status:    event.status,
      } : null}
    />
  );
}
