import { getPayments, getGoldPayments } from './googleSheetsHelper';

// Cache structure with timestamps for invalidation
type CacheItem<T> = {
  data: T;
  lastFetched: Date;
  lastAccessed: Date;
};

// Cache storage
let paymentsCache: CacheItem<any[]> | null = null;
let goldPaymentsCache: CacheItem<any[]> | null = null;

// Cache configuration in milliseconds
const CACHE_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
const CACHE_INVALIDATION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

/**
 * Get payments with caching
 * Cache refreshes every 15 minutes or is invalidated after 30 minutes of inactivity
 */
export async function getCachedPayments(): Promise<any[]> {
  const now = new Date();
  
  // If cache exists, update lastAccessed timestamp
  if (paymentsCache) {
    paymentsCache.lastAccessed = now;
    
    // Check if cache is still fresh (less than 15 minutes old)
    const cacheAge = now.getTime() - paymentsCache.lastFetched.getTime();
    
    // Check if cache has been inactive for 30 minutes
    const inactiveTime = now.getTime() - paymentsCache.lastAccessed.getTime();
    
    // Return cached data if it's fresh and not inactive
    if (cacheAge < CACHE_REFRESH_INTERVAL && inactiveTime < CACHE_INVALIDATION_TIMEOUT) {
      console.log('📦 Using cached payments data');
      return paymentsCache.data;
    }
  }
  
  // Cache doesn't exist, is stale, or has been inactive too long - fetch fresh data
  console.log('🔄 Refreshing payments cache');
  try {
    const payments = await getPayments();
    paymentsCache = {
      data: payments,
      lastFetched: now,
      lastAccessed: now
    };
    return payments;
  } catch (error) {
    console.error('Error fetching payments for cache:', error);
    // If we have stale cache, return it as fallback
    if (paymentsCache) {
      console.log('⚠️ Using stale payments cache due to fetch error');
      return paymentsCache.data;
    }
    // Otherwise throw the error
    throw error;
  }
}

/**
 * Get gold payments with caching
 * Cache refreshes every 15 minutes or is invalidated after 30 minutes of inactivity
 */
export async function getCachedGoldPayments(): Promise<any[]> {
  const now = new Date();
  
  // If cache exists, update lastAccessed timestamp
  if (goldPaymentsCache) {
    goldPaymentsCache.lastAccessed = now;
    
    // Check if cache is still fresh (less than 15 minutes old)
    const cacheAge = now.getTime() - goldPaymentsCache.lastFetched.getTime();
    
    // Check if cache has been inactive for 30 minutes
    const inactiveTime = now.getTime() - goldPaymentsCache.lastAccessed.getTime();
    
    // Return cached data if it's fresh and not inactive
    if (cacheAge < CACHE_REFRESH_INTERVAL && inactiveTime < CACHE_INVALIDATION_TIMEOUT) {
      console.log('📦 Using cached gold payments data');
      return goldPaymentsCache.data;
    }
  }
  
  // Cache doesn't exist, is stale, or has been inactive too long - fetch fresh data
  console.log('🔄 Refreshing gold payments cache');
  try {
    const goldPayments = await getGoldPayments();
    goldPaymentsCache = {
      data: goldPayments,
      lastFetched: now,
      lastAccessed: now
    };
    return goldPayments;
  } catch (error) {
    console.error('Error fetching gold payments for cache:', error);
    // If we have stale cache, return it as fallback
    if (goldPaymentsCache) {
      console.log('⚠️ Using stale gold payments cache due to fetch error');
      return goldPaymentsCache.data;
    }
    // Otherwise throw the error
    throw error;
  }
}

// Function to manually invalidate caches if needed (e.g., after updates)
export function invalidatePaymentsCache() {
  paymentsCache = null;
  console.log('🗑️ Payments cache invalidated');
}

export function invalidateGoldPaymentsCache() {
  goldPaymentsCache = null;
  console.log('🗑️ Gold payments cache invalidated');
} 