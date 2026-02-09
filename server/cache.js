/**
 * server/cache.js — In-memory TTL cache
 * Agent/backend owns this file.
 *
 * Interface: { get(key), set(key, value, ttlMs), has(key) }
 */

class Cache {
    constructor() {
        this.store = new Map();
    }

    /**
     * Get a cached value. Returns null if expired or missing.
     */
    get(key) {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiry) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }

    /**
     * Store a value with a TTL (default 15 minutes).
     */
    set(key, value, ttlMs = 15 * 60 * 1000) {
        this.store.set(key, {
            value,
            expiry: Date.now() + ttlMs,
        });
    }

    /**
     * Check if a key exists and is not expired.
     */
    has(key) {
        return this.get(key) !== null;
    }
}

module.exports = new Cache();
