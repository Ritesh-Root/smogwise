/** Small in-memory cache with a time-to-live and a size cap (oldest entry evicted first). */
export class TtlCache {
  /** @param {{ttlMs: number, max: number, now?: () => number}} options */
  constructor({ ttlMs, max, now = Date.now }) {
    this.ttlMs = ttlMs;
    this.max = max;
    this.now = now;
    this.entries = new Map();
  }

  /** @param {string} key */
  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expires <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /** @param {string} key @param {unknown} value */
  set(key, value) {
    this.entries.delete(key);
    if (this.entries.size >= this.max) {
      this.entries.delete(this.entries.keys().next().value);
    }
    this.entries.set(key, { value, expires: this.now() + this.ttlMs });
  }

  /**
   * Return the cached value, or compute and store it. Concurrent callers share one in-flight
   * promise, and a rejected promise is dropped so the next call retries.
   * @template T
   * @param {string} key
   * @param {() => Promise<T>} compute
   * @returns {Promise<T>}
   */
  getOrCompute(key, compute) {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const pending = compute().catch((error) => {
      this.entries.delete(key);
      throw error;
    });
    this.set(key, pending);
    return pending;
  }
}
