import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import { isAuthenticated } from "@/lib/auth";
import { validateInput, BookingQuerySchema } from "@/lib/validation";
import { validateRateLimit } from "@/lib/validation";
import { BookingDoc } from "@/types";

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate rate limiting
    const rateLimitCheck = validateRateLimit(req.headers);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json({ error: rateLimitCheck.message }, { 
        status: 429,
        headers: { "Retry-After": "60" }
      });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const query = validateInput(BookingQuerySchema, {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      scanned: searchParams.get('scanned') || undefined,
      eventId: searchParams.get('eventId') || undefined,
      sort: searchParams.get('sort') || undefined,
      order: searchParams.get('order') || undefined,
    });

    // Add pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200); // Max 200 for performance
    const offset = (page - 1) * limit;

    const db = getDb();
    let bookingsQuery: any = db.collection("bookings")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .offset(offset);

    // Apply filters
    if (query.eventId) {
      bookingsQuery = bookingsQuery.where("eventId", "==", query.eventId);
    }
    
    if (query.status && query.status !== "all") {
      bookingsQuery = bookingsQuery.where("ticketStatus", "==", query.status);
    }

    // Execute query
    const bookingsSnapshot = await bookingsQuery.get();
    let bookings = bookingsSnapshot.docs.map((doc: any) => ({
      bookingId: doc.id,
      ...doc.data() as Omit<BookingDoc, 'bookingId'>
    }));

    // Apply client-side filters (for scanned status and search)
    if (query.scanned && query.scanned !== "all") {
      bookings = bookings.filter((booking: any) => {
        const isScanned = booking.scannedAt && booking.scannedAt !== null;
        return query.scanned === "scanned" ? isScanned : !isScanned;
      });
    }

    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      bookings = bookings.filter((booking: any) => 
        booking.bookingId.toLowerCase().includes(searchTerm) ||
        booking.userId.toLowerCase().includes(searchTerm) ||
        booking.uid.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    if (query.sort) {
      bookings.sort((a: any, b: any) => {
        let aVal: any, bVal: any;
        
        switch (query.sort) {
          case "createdAt":
            aVal = a.createdAt?.toMillis?.() || 0;
            bVal = b.createdAt?.toMillis?.() || 0;
            break;
          case "userName":
            // Sort by userId since userName is not available in BookingDoc
            aVal = a.userId || "";
            bVal = b.userId || "";
            break;
          case "eventTitle":
            // Sort by eventId since eventTitle is not available in BookingDoc
            aVal = a.eventId || "";
            bVal = b.eventId || "";
            break;
          default:
            return 0;
        }
        
        if (query.order === "desc") {
          return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
        }
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      });
    }

    return NextResponse.json({ 
      bookings,
      total: bookings.length,
      page,
      limit,
      query,
      hasMore: bookings.length === limit
    });

  } catch (error) {
    console.error("Bookings API Error:", error);
    
    if (error instanceof Error && error.message.includes("Validation failed")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}