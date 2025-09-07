/**
 * Cache management utilities for user profile and other cached data
 */

export class CacheManager {
  private static instance: CacheManager;
  private cacheVersion = 'v1';

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Invalidate all user-related caches
   */
  async invalidateUserCaches(): Promise<void> {
    try {
      // Invalidate user profile cache by making a cache-busting request
      await this.invalidateUserProfileCache();

      // Clear any client-side caches
      if (typeof window !== 'undefined') {
        // Clear localStorage/sessionStorage if used
        this.clearClientSideCaches();
      }

      console.log('✅ All user caches invalidated');
    } catch (error) {
      console.error('❌ Failed to invalidate caches:', error);
    }
  }

  /**
   * Invalidate user profile cache specifically
   */
  async invalidateUserProfileCache(): Promise<void> {
    try {
      // Make a request that will bypass cache
      const timestamp = Date.now();
      const response = await fetch(`/api/user-profile?_t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        console.log('🔄 User profile cache invalidated');
      }
    } catch (error) {
      console.error('❌ Failed to invalidate user profile cache:', error);
    }
  }

  /**
   * Clear client-side caches
   */
  private clearClientSideCaches(): void {
    try {
      // Clear any cached user data in localStorage
      const keysToRemove = Object.keys(localStorage).filter(key =>
        key.startsWith('user_') ||
        key.startsWith('profile_') ||
        key.startsWith('auth_')
      );

      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Clear sessionStorage as well
      const sessionKeysToRemove = Object.keys(sessionStorage).filter(key =>
        key.startsWith('user_') ||
        key.startsWith('profile_') ||
        key.startsWith('auth_')
      );

      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

      console.log('🗑️ Client-side caches cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear client-side caches:', error);
    }
  }

  /**
   * Force refresh a cached endpoint
   */
  async forceRefresh(endpoint: string): Promise<void> {
    try {
      const timestamp = Date.now();
      const response = await fetch(`${endpoint}?_t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        console.log(`🔄 Cache refreshed for ${endpoint}`);
      }
    } catch (error) {
      console.error(`❌ Failed to refresh cache for ${endpoint}:`, error);
    }
  }

  /**
   * Check if caching is working by examining response headers
   */
  async checkCacheStatus(endpoint: string = '/api/user-profile'): Promise<{
    isCached: boolean;
    cacheControl: string | null;
    age: string | null;
  }> {
    try {
      const response = await fetch(endpoint);
      const cacheControl = response.headers.get('cache-control');
      const age = response.headers.get('age');

      return {
        isCached: cacheControl?.includes('s-maxage') || false,
        cacheControl,
        age
      };
    } catch (error) {
      console.error('❌ Failed to check cache status:', error);
      return {
        isCached: false,
        cacheControl: null,
        age: null
      };
    }
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();
