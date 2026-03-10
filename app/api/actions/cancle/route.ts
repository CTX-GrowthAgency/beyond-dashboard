import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import { isAuthenticated } from "@/lib/auth";

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

  const db   = getDb();
  const ref  = db.collection("bookings").doc(bookingId);
  const snap = await ref.get();

  if (!snap.exists) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const data = snap.data()!;
  if (data.ticketStatus === "cancelled") {
    return NextResponse.json({ error: "Booking already cancelled" }, { status: 409 });
  }


  return NextResponse.json({ 
    success: true, 
    message: "Database updates are disabled. Booking data remains unchanged." 
  });
}
