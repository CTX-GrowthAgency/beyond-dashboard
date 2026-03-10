// lib/cache.ts - Simple in-memory cache for Firestore queries
import { getDb } from './firebase';

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const cache = new Map<string, CacheEntry<any>>();

export async function getCachedData<T>(
  key: string, 
  fetcher: () => Promise<T>, 
  ttlMs: number = 300000 // 5 minutes default
): Promise<T> {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  
  const data = await fetcher();
  cache.set(key, { data, expiry: Date.now() + ttlMs });
  return data;
}

export function clearCache(pattern?: string) {
  if (pattern) {
    for (const [key] of cache.entries()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

// Pre-aggregated stats collection
export async function getEventStats(eventId?: string) {
  const db = getDb();
  const cacheKey = eventId ? `event_stats_${eventId}` : 'all_event_stats';
  
  return getCachedData(cacheKey, async () => {
    const statsRef = db.collection('event_stats');
    const doc = eventId ? await statsRef.doc(eventId).get() : await statsRef.doc('global').get();
    
    if (doc.exists) {
      return doc.data();
    }
    
    // Fallback: calculate on-demand (less frequent)
    return calculateEventStats(eventId);
  });
}

async function calculateEventStats(eventId?: string) {
  const db = getDb();
  
  let bookingsQuery = db.collection('bookings')
    .where('paymentStatus', '==', 'completed');
    
  if (eventId) {
    bookingsQuery = bookingsQuery.where('eventId', '==', eventId);
  }
  
  const snapshot = await bookingsQuery.get();
  const bookings = snapshot.docs.map(doc => doc.data());
  
  const stats = {
    totalBookings: bookings.length,
    totalRevenue: bookings.reduce((sum: number, b: any) => sum + (b.pricing?.grandTotal || 0), 0),
    totalTicketsSold: bookings.reduce((sum: number, b: any) => 
      sum + (b.tickets?.reduce((s: number, t: any) => s + t.quantity, 0) || 0), 0
    ),
    scannedCount: bookings.filter((b: any) => b.scannedAt).length,
    lastUpdated: new Date().toISOString(),
  };
  
  // Store for future use (if you enable writes later)
  // await db.collection('event_stats').doc(eventId || 'global').set(stats);
  
  return stats;
}
