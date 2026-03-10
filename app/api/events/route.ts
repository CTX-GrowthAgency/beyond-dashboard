import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import { isAuthenticated } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const eventsSnapshot = await db.collection("events").get();
  const events = eventsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return NextResponse.json({ events });
}