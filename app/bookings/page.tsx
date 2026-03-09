import { getDb } from "@/lib/firebase";
import { BookingDoc, BookingRow, DashboardStats } from "@/types";
import BookingsTable from "@/components/BookingTable";
import { Timestamp } from "firebase-admin/firestore";
import { requireAuth } from "@/lib/auth";

function tsToIso(ts: Timestamp | undefined | null): string | undefined {
  if (!ts) return undefined;
  return ts.toDate().toISOString();
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; event?: string; q?: string; scanned?: string }>;
}) {
  await requireAuth();
  const { status, event, q, scanned } = await searchParams;
  const db = getDb();

  let query = db
    .collection("bookings")
    .orderBy("createdAt", "desc")
    .limit(500) as FirebaseFirestore.Query;

  if (status && status !== "all") {
    query = query.where("paymentStatus", "==", status);
  }
  if (event && event !== "all") {
    query = query.where("eventId", "==", event);
  }

  const [bookingsSnap, eventsSnap, usersSnap] = await Promise.all([
    query.get(),
    db.collection("events").get(),
    db.collection("users").get(),
  ]);

  const eventMap: Record<string, string> = {};
  eventsSnap.docs.forEach((d) => {
    eventMap[d.id] = (d.data() as { title?: string }).title ?? d.id;
  });

  const userMap: Record<string, { name: string; email: string; phone: string }> = {};
  usersSnap.docs.forEach((d) => {
    const u = d.data() as { name?: string; email?: string; phone?: string };
    userMap[d.id] = { name: u.name ?? "", email: u.email ?? "", phone: u.phone ?? "" };
  });

  const eventOptions = Object.entries(eventMap).map(([id, title]) => ({ id, title }));

  let rows: BookingRow[] = bookingsSnap.docs.map((doc) => {
    const d = doc.data() as BookingDoc;
    const uid = d.userId ?? d.uid ?? "";
    const user = userMap[uid];
    return {
      bookingId:          doc.id,
      userId:             uid,
      eventId:            d.eventId ?? "",
      eventSlug:          d.eventSlug ?? "",
      eventTitle:         eventMap[d.eventId] ?? d.eventId,
      userName:           user?.name,
      userEmail:          user?.email,
      userPhone:          user?.phone,
      tickets:            d.tickets ?? [],
      pricing:            d.pricing ?? { subtotal: 0, convenienceFee: 0, gst: 0, grandTotal: 0 },
      paymentStatus:      d.paymentStatus ?? "pending",
      ticketStatus:       d.ticketStatus ?? "pending",
      paymentMethod:      d.paymentMethod,
      cashfreeOrderId:    d.cashfreeOrderId,
      createdAt:          tsToIso(d.createdAt) ?? new Date().toISOString(),
      paidAt:             tsToIso(d.paidAt),
      notificationSentAt: tsToIso(d.notificationSentAt),
      scannedAt:          tsToIso(d.scannedAt),
      scannedBy:          d.scannedBy,
    };
  });

  // Text search
  if (q) {
    const lower = q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.bookingId.toLowerCase().includes(lower) ||
        r.userName?.toLowerCase().includes(lower) ||
        r.userEmail?.toLowerCase().includes(lower) ||
        r.eventTitle?.toLowerCase().includes(lower) ||
        r.cashfreeOrderId?.toLowerCase().includes(lower)
    );
  }

  // Scanned filter
  if (scanned === "yes") rows = rows.filter((r) => !!r.scannedAt);
  if (scanned === "no")  rows = rows.filter((r) => !r.scannedAt && r.paymentStatus === "completed" && r.ticketStatus === "confirmed");

  const confirmed = rows.filter((r) => r.paymentStatus === "completed");

  const stats: DashboardStats = {
    totalBookings:     rows.length,
    confirmedBookings: confirmed.length,
    pendingBookings:   rows.filter((r) => r.paymentStatus === "pending").length,
    failedBookings:    rows.filter((r) => r.paymentStatus === "failed").length,
    totalRevenue:      confirmed.reduce((s, r) => s + (r.pricing?.grandTotal ?? 0), 0),
    totalTicketsSold:  confirmed.reduce((s, r) => s + r.tickets.reduce((ts, t) => ts + t.quantity, 0), 0),
    scannedCount:      rows.filter((r) => !!r.scannedAt).length,
    notScannedCount:   confirmed.filter((r) => !r.scannedAt && r.ticketStatus === "confirmed").length,
  };

  return (
    <BookingsTable
      rows={rows}
      stats={stats}
      eventOptions={eventOptions}
      initialStatus={status ?? "all"}
      initialEvent={event ?? "all"}
      initialQ={q ?? ""}
      initialScanned={scanned ?? "all"}
    />
  );
}