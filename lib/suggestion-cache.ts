import type { EnhancedSuggestion, CachedSuggestion } from "./ai-types"

export class SuggestionCache {
  private cache = new Map<string, CachedSuggestion>()
  private readonly MAX_CACHE_SIZE = 100
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get cached suggestions if available and valid
   */
  getCachedSuggestions(textHash: string): EnhancedSuggestion[] | null {
    const cached = this.cache.get(textHash)

    if (!cached) return null

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(textHash)
      return null
    }

    return cached.suggestions
  }

  /**
   * Cache suggestions with TTL
   */
  cacheSuggestions(textHash: string, suggestions: EnhancedSuggestion[]): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(textHash, {
      suggestions,
      timestamp: Date.now(),
      textHash,
    })
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }
}

export const suggestionCache = new SuggestionCache()

// Cleanup expired entries every 5 minutes
if (typeof window !== "undefined") {
  setInterval(
    () => {
      suggestionCache.cleanup()
    },
    5 * 60 * 1000,
  )
}
