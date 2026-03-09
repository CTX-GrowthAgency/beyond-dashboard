import { Timestamp } from "firebase-admin/firestore";

export interface TicketLine {
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface Pricing {
  subtotal: number;
  convenienceFee: number;
  gst: number;
  grandTotal: number;
}

export interface BookingDoc {
  bookingId: string;
  userId: string;
  uid: string;
  eventId: string;
  eventSlug: string;
  tickets: TicketLine[];
  pricing: Pricing;
  cashfreeOrderId?: string;
  paymentReference?: string;
  paymentMethod?: string;
  paymentStatus: "pending" | "completed" | "failed";
  ticketStatus: "pending" | "confirmed" | "cancelled";
  createdAt: Timestamp;
  expiresAt?: Timestamp;
  paidAt?: Timestamp;
  verifiedAt?: Timestamp;
  notificationSentAt?: Timestamp;
  scannedAt?: Timestamp;   // set by scanner app when ticket is verified at gate
  scannedBy?: string;      // operator/device identifier from scanner app
}

export interface TicketTypeInventory {
  price: number;
  capacity?: number;
}

export interface EventDoc {
  id: string;
  title: string;
  date: Timestamp;
  venueName: string;
  status: "active" | "inactive";
  ticketTypes: Record<string, TicketTypeInventory>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserDoc {
  name: string;
  email: string;
  phone: string;
  nationality?: string;
  state?: string;
  createdAt: Timestamp;
}

// Serialized (JSON-safe) versions for client components
export interface BookingRow {
  bookingId: string;
  userId: string;
  eventId: string;
  eventSlug: string;
  eventTitle?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  tickets: TicketLine[];
  pricing: Pricing;
  paymentStatus: string;
  ticketStatus: string;
  paymentMethod?: string;
  cashfreeOrderId?: string;
  createdAt: string;
  paidAt?: string;
  notificationSentAt?: string;
  scannedAt?: string;      // ISO string — set when scanned at gate
  scannedBy?: string;      // operator/device that scanned it
}

export interface EventRow {
  id: string;
  title: string;
  date: string;
  venueName: string;
  status: string;
  ticketTypes: Record<string, TicketTypeInventory>;
  totalBookings: number;
  totalRevenue: number;
  totalTicketsSold: number;
}

export interface DashboardStats {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  failedBookings: number;
  totalRevenue: number;
  totalTicketsSold: number;
  scannedCount: number;    
  notScannedCount: number;    
}