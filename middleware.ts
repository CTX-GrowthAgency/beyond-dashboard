import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security Headers
  const securityHeaders = {
    // Content Security Policy
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://fonts.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "upgrade-insecure-requests"
    ].join("; "),
    
    // Prevent clickjacking
    "X-Frame-Options": "DENY",
    
    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",
    
    // XSS Protection
    "X-XSS-Protection": "1; mode=block",
    
    // Referrer Policy
    "Referrer-Policy": "strict-origin-when-cross-origin",
    
    // Permissions Policy
    "Permissions-Policy": [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "magnetometer=()",
      "gyroscope=()",
      "accelerometer=()"
    ].join(", "),
    
    // HSTS (only in production)
    ...(process.env.NODE_ENV === "production" ? {
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload"
    } : {})
  };

  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const ip = request.headers.get("x-forwarded-for") || 
               request.headers.get("x-real-ip") || 
               "unknown";
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 100; // 100 requests per minute per IP

    // Simple in-memory rate limiting (for production, use Redis)
    type RateLimitMap = Map<string, number>;
    const rateLimit = (global as any)._rateLimit = (global as any)._rateLimit || new Map() as RateLimitMap;
    const key = `${ip}:${Math.floor(now / windowMs)}`;
    const current = rateLimit.get(key) || 0;
    
    if (current >= maxRequests) {
      return new NextResponse("Too Many Requests", { 
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Limit": maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": ((Math.floor(now / windowMs) + 1) * windowMs).toString()
        }
      });
    }
    
    rateLimit.set(key, current + 1);
    
    // Add rate limit headers
    response.headers.set("X-RateLimit-Limit", maxRequests.toString());
    response.headers.set("X-RateLimit-Remaining", Math.max(0, maxRequests - current - 1).toString());
    response.headers.set("X-RateLimit-Reset", ((Math.floor(now / windowMs) + 1) * windowMs).toString());
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
