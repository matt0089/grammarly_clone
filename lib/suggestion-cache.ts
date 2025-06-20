import type { EnhancedSuggestion, CachedSuggestion } from "./ai-types"

export class SuggestionCache {
  private cache = new Map<string, CachedSuggestion>()
  private readonly MAX_CACHE_SIZE = 20
  private readonly CACHE_TTL = 2 * 60 * 1000 // 2 minutes
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Start cleanup interval only on server side
    if (typeof window === "undefined") {
      this.startCleanupInterval()
    }
  }

  private startCleanupInterval() {
    // Clear any existing interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    // Set up new cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60 * 1000) // Cleanup every minute

    // Ensure interval doesn't keep process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

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
    // More aggressive LRU eviction
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest 50% of entries when cache is full
      const keysToRemove = Array.from(this.cache.keys()).slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.5))
      keysToRemove.forEach((key) => this.cache.delete(key))
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
    let removedCount = 0

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key)
        removedCount++
      }
    }

    if (removedCount > 0) {
      console.log(`Cache cleanup: removed ${removedCount} expired entries`)
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Destroy cache and cleanup intervals
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}

export const suggestionCache = new SuggestionCache()

// Cleanup on process exit (Node.js)
if (typeof process !== "undefined") {
  process.on("exit", () => {
    suggestionCache.destroy()
  })

  process.on("SIGINT", () => {
    suggestionCache.destroy()
    process.exit(0)
  })

  process.on("SIGTERM", () => {
    suggestionCache.destroy()
    process.exit(0)
  })
}
