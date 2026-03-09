import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import { isAuthenticated } from "@/lib/auth";
import { BookingDoc, UserDoc, EventDoc } from "@/types";
import { Timestamp } from "firebase-admin/firestore";

// ── Inline ticket email builder ──────────────────────────────────────────────
// Mirrors the logic in your main app's lib/email/buildInvoiceHtml.ts
// so the dashboard doesn't need to import from the main app.

function buildTicketEmailHtml(params: {
  bookingId: string;
  userName: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  tickets: { name: string; quantity: number; lineTotal: number }[];
  grandTotal: number;
  qrUrl: string;
}) {
  const { bookingId, userName, eventTitle, eventDate, venueName, tickets, grandTotal, qrUrl } = params;
  const ticketRows = tickets
    .map(
      (t) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #222;">${t.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #222;text-align:center;">${t.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #222;text-align:right;">₹${t.lineTotal.toLocaleString("en-IN")}</td>
        </tr>`
    )
    .join("");

  return `
<!DOCTYPE html><html><body style="margin:0;background:#080808;font-family:sans-serif;color:#f0ede6;">
<div style="max-width:520px;margin:40px auto;background:#111;border:1px solid #222;border-top:3px solid #c9b97a;">
  <div style="padding:28px 32px;border-bottom:1px solid #222;">
    <div style="font-size:22px;font-weight:700;letter-spacing:0.06em;color:#c9b97a;">BEYOND</div>
    <div style="font-size:12px;color:#666;margin-top:4px;letter-spacing:0.1em;text-transform:uppercase;">Ticket Confirmation</div>
  </div>
  <div style="padding:28px 32px;">
    <p style="color:#aaa;font-size:14px;">Hi ${userName},</p>
    <p style="color:#aaa;font-size:14px;margin-bottom:24px;">Your ticket for <strong style="color:#f0ede6;">${eventTitle}</strong> is confirmed. Show the QR code at the venue.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr style="background:#161616;">
        <th style="padding:8px 12px;text-align:left;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#666;">Ticket</th>
        <th style="padding:8px 12px;text-align:center;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#666;">Qty</th>
        <th style="padding:8px 12px;text-align:right;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#666;">Total</th>
      </tr>
      ${ticketRows}
      <tr style="background:#161616;">
        <td colspan="2" style="padding:10px 12px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#666;text-align:right;font-weight:600;">Grand Total</td>
        <td style="padding:10px 12px;text-align:right;font-size:18px;font-weight:700;color:#c9b97a;">₹${grandTotal.toLocaleString("en-IN")}</td>
      </tr>
    </table>
    <div style="background:#161616;border:1px solid #222;padding:18px;margin-bottom:20px;">
      <div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#666;margin-bottom:8px;">Event Details</div>
      <div style="font-size:14px;color:#f0ede6;font-weight:600;">${eventTitle}</div>
      <div style="font-size:13px;color:#aaa;margin-top:4px;">${eventDate} · ${venueName}</div>
    </div>
    <div style="text-align:center;padding:20px 0;">
      <div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#666;margin-bottom:12px;">Your Entry QR Code</div>
      <img src="${qrUrl}" alt="QR Code" width="200" height="200" style="display:block;margin:0 auto;" />
      <div style="font-size:11px;color:#555;margin-top:10px;">Booking ID: ${bookingId}</div>
    </div>
  </div>
  <div style="padding:16px 32px;border-top:1px solid #222;font-size:11px;color:#444;text-align:center;">
    Beyond · contactbeyondteam@gmail.com · Owned &amp; operated by Harsh Pilankar &amp; Anant Sawant
  </div>
</div>
</body></html>`;
}

// ── Nodemailer sender ─────────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  await transporter.sendMail({
    from:    `"Beyond" <${process.env.SMTP_FROM ?? "contactbeyondteam@gmail.com"}>`,
    to,
    subject,
    html,
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let bookingId: string;
  try {
    const body = await req.json();
    bookingId = body.bookingId;
    if (!bookingId) throw new Error("Missing bookingId");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const db        = getDb();
  const bookSnap  = await db.collection("bookings").doc(bookingId).get();
  if (!bookSnap.exists) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const booking  = bookSnap.data() as BookingDoc;
  const uid      = booking.userId ?? booking.uid ?? "";

  const [userSnap, eventSnap] = await Promise.all([
    uid ? db.collection("users").doc(uid).get() : Promise.resolve(null),
    booking.eventId ? db.collection("events").doc(booking.eventId).get() : Promise.resolve(null),
  ]);

  const user  = userSnap?.exists  ? (userSnap.data()  as UserDoc)  : null;
  const event = eventSnap?.exists ? (eventSnap.data() as EventDoc) : null;

  if (!user?.email) {
    return NextResponse.json({ error: "No email address found for this user" }, { status: 422 });
  }

  const eventDate = event?.date instanceof Timestamp
    ? event.date.toDate().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })
    : "See event details";

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.MAIN_APP_URL ?? "https://bookonbeyond.vercel.app";
  const qrUrl   = `${baseUrl}/api/qr/${bookingId}`;

  const html = buildTicketEmailHtml({
    bookingId,
    userName:   user.name || "there",
    eventTitle: event?.title ?? "Your Event",
    eventDate,
    venueName:  event?.venueName ?? "",
    tickets:    booking.tickets ?? [],
    grandTotal: booking.pricing?.grandTotal ?? 0,
    qrUrl,
  });

  try {
    await sendEmail(
      user.email,
      `Your ticket for ${event?.title ?? "Beyond"} — Booking ${bookingId}`,
      html
    );
  } catch (err) {
    console.error("[resend-email]", err);
    return NextResponse.json({ error: "Failed to send email. Check SMTP config." }, { status: 500 });
  }

  // Update notificationSentAt
  await db.collection("bookings").doc(bookingId).update({
    notificationSentAt: new Date(),
  });

  return NextResponse.json({ success: true });
}
