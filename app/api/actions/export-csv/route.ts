import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import { isAuthenticated } from "@/lib/auth";
import { BookingDoc, EventDoc, UserDoc } from "@/types";
import { Timestamp } from "firebase-admin/firestore";

function tsToStr(ts: Timestamp | undefined | null) {
  if (!ts) return "";
  return ts.toDate().toLocaleString("en-IN");
}

function escape(v: string | number | undefined | null): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSV(headers: string[], rows: (string | number | undefined | null)[][]): string {
  const lines = [headers.map(escape).join(",")];
  rows.forEach((row) => lines.push(row.map(escape).join(",")));
  return lines.join("\r\n");
}

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type   = searchParams.get("type") ?? "bookings";
  const status = searchParams.get("status");
  const event  = searchParams.get("event");
  const db     = getDb();

  // ── EVENTS CSV ───────────────────────────────────────────────────────────
  if (type === "events") {
    let query = db.collection("events").orderBy("createdAt", "desc") as FirebaseFirestore.Query;
    if (status && status !== "all") query = query.where("status", "==", status);

    const [evSnap, bkSnap] = await Promise.all([
      query.get(),
      db.collection("bookings").where("paymentStatus", "==", "completed").get(),
    ]);

    const revMap: Record<string, { revenue: number; tickets: number; bookings: number }> = {};
    bkSnap.docs.forEach((d) => {
      const b = d.data() as BookingDoc;
      if (!revMap[b.eventId]) revMap[b.eventId] = { revenue: 0, tickets: 0, bookings: 0 };
      revMap[b.eventId].revenue  += b.pricing?.grandTotal ?? 0;
      revMap[b.eventId].tickets  += b.tickets?.reduce((s, t) => s + t.quantity, 0) ?? 0;
      revMap[b.eventId].bookings += 1;
    });

    const headers = ["Event ID", "Title", "Date", "Venue", "Status", "Ticket Types", "Bookings", "Tickets Sold", "Revenue (INR)"];
    const rows = evSnap.docs.map((doc) => {
      const e   = doc.data() as EventDoc;
      const rev = revMap[doc.id] ?? { revenue: 0, tickets: 0, bookings: 0 };
      const types = Object.entries(e.ticketTypes ?? {})
        .map(([n, i]) => `${n}:₹${i.price}`)
        .join(" | ");
      return [doc.id, e.title, tsToStr(e.date), e.venueName, e.status, types, rev.bookings, rev.tickets, rev.revenue];
    });

    const csv = toCSV(headers, rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="beyond-events-${Date.now()}.csv"`,
      },
    });
  }

  // ── BOOKINGS CSV ─────────────────────────────────────────────────────────
  let query = db.collection("bookings").orderBy("createdAt", "desc").limit(2000) as FirebaseFirestore.Query;
  if (status && status !== "all") query = query.where("paymentStatus", "==", status);
  if (event  && event  !== "all") query = query.where("eventId", "==", event);

  const [bkSnap, evSnap, usSnap] = await Promise.all([
    query.get(),
    db.collection("events").get(),
    db.collection("users").get(),
  ]);

  const eventMap: Record<string, string> = {};
  evSnap.docs.forEach((d) => { eventMap[d.id] = (d.data() as EventDoc).title ?? d.id; });

  const userMap: Record<string, { name: string; email: string; phone: string }> = {};
  usSnap.docs.forEach((d) => {
    const u = d.data() as UserDoc;
    userMap[d.id] = { name: u.name ?? "", email: u.email ?? "", phone: u.phone ?? "" };
  });

  const headers = [
    "Booking ID", "Event", "Attendee Name", "Email", "Phone",
    "Tickets", "Subtotal (INR)", "Convenience Fee (INR)", "GST (INR)", "Grand Total (INR)",
    "Payment Status", "Ticket Status", "Payment Method", "Cashfree Order ID",
    "Booked At", "Paid At", "Email Sent At",
  ];

  const rows = bkSnap.docs.map((doc) => {
    const b    = doc.data() as BookingDoc;
    const uid  = b.userId ?? b.uid ?? "";
    const user = userMap[uid] ?? { name: "", email: "", phone: "" };
    const ticketSummary = (b.tickets ?? []).map((t) => `${t.name}×${t.quantity}`).join(" | ");
    return [
      doc.id,
      eventMap[b.eventId] ?? b.eventId,
      user.name,
      user.email,
      user.phone,
      ticketSummary,
      b.pricing?.subtotal ?? 0,
      b.pricing?.convenienceFee ?? 0,
      b.pricing?.gst ?? 0,
      b.pricing?.grandTotal ?? 0,
      b.paymentStatus,
      b.ticketStatus,
      b.paymentMethod ?? "",
      b.cashfreeOrderId ?? "",
      tsToStr(b.createdAt),
      tsToStr(b.paidAt),
      tsToStr(b.notificationSentAt),
    ];
  });

  const csv = toCSV(headers, rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="beyond-bookings-${Date.now()}.csv"`,
    },
  });
}
