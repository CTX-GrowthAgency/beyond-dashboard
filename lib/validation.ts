import { z } from "zod";

// Common validation schemas
export const EventIdSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const BookingIdSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const EmailSchema = z.string().email().max(255);
export const SearchSchema = z.string().max(100).optional();

// Event validation
export const EventQuerySchema = z.object({
  search: SearchSchema,
  status: z.enum(["all", "active", "inactive"]).optional(),
  sort: z.enum(["title", "date", "totalRevenue", "totalTicketsSold"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

// Booking validation
export const BookingQuerySchema = z.object({
  search: SearchSchema,
  status: z.enum(["all", "confirmed", "pending", "cancelled"]).optional(),
  scanned: z.enum(["all", "scanned", "not-scanned"]).optional(),
  eventId: EventIdSchema.optional(),
  sort: z.enum(["createdAt", "paidAt", "userName", "eventTitle"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

// Email validation for resend
export const ResendEmailSchema = z.object({
  bookingId: BookingIdSchema,
});

// Cancel booking validation
export const CancelBookingSchema = z.object({
  bookingId: BookingIdSchema,
  reason: z.string().min(1).max(500).optional(),
});

// Export CSV validation
export const ExportCsvSchema = z.object({
  eventId: EventIdSchema.optional(),
  status: z.enum(["all", "confirmed", "pending", "cancelled"]).optional(),
  scanned: z.enum(["all", "scanned", "not-scanned"]).optional(),
});

// Validation helper function
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }
    throw error;
  }
}

// Sanitization helpers
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

export function sanitizeSearchQuery(query: string): string {
  return sanitizeString(query)
    .replace(/[^a-zA-Z0-9\s@.-]/g, '') // Allow only alphanumeric, space, @, ., -
    .substring(0, 100); // Limit length
}

// Rate limiting validation
export function validateRateLimit(headers: Headers): { allowed: boolean; message?: string } {
  const remaining = headers.get("X-RateLimit-Remaining");
  if (remaining === "0") {
    const resetTime = headers.get("X-RateLimit-Reset");
    const retryAfter = resetTime ? Math.ceil((parseInt(resetTime) - Date.now()) / 1000) : 60;
    return {
      allowed: false,
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`
    };
  }
  return { allowed: true };
}
