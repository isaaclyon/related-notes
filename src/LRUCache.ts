/**
 * Simple LRU (Least Recently Used) Cache implementation
 * Used to cache expensive algorithm results like PageRank computations
 */
export class LRUCache<T> {
  private cache: Map<string, { value: T; timestamp: number }> = new Map()
  private readonly maxSize: number
  private readonly maxAge: number // in milliseconds

  constructor(maxSize = 100, maxAgeMinutes = 30) {
    this.maxSize = maxSize
    this.maxAge = maxAgeMinutes * 60 * 1000 // convert to ms
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }
    
    // Check if entry is expired
    const now = Date.now()
    if (now - entry.timestamp > this.maxAge) {
      this.cache.delete(key)
      return null
    }
    
    // Move to end (most recent)
    this.cache.delete(key)
    this.cache.set(key, { ...entry, timestamp: now })
    
    return entry.value
  }

  set(key: string, value: T): void {
    const now = Date.now()
    
    // Remove existing entry
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }
    
    // Add new entry
    this.cache.set(key, { value, timestamp: now })
    
    // Evict oldest entries if over capacity
    while (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    // Check expiration
    const now = Date.now()
    if (now - entry.timestamp > this.maxAge) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern)
    const keysToDelete: string[] = []
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      maxAge: this.maxAge / 1000 / 60, // in minutes
      keys: Array.from(this.cache.keys())
    }
  }
}