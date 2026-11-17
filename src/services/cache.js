// @ts-check
/**
 * Small in-memory cache with a time-to-live and a size cap (oldest entry evicted first).
 * @template V
 */
export class TtlCache {
  #ttlMs;
  #max;
  #now;
  /** @type {Map<string, {value: V, expires: number}>} */
  #entries = new Map();

  /** @param {{ttlMs: number, max: number, now?: () => number}} options */
  constructor({ ttlMs, max, now = Date.now }) {
    this.#ttlMs = ttlMs;
    this.#max = max;
    this.#now = now;
  }

  /**
   * @param {string} key
   * @returns {V | undefined}
   */
  get(key) {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    if (entry.expires <= this.#now()) {
      this.#entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * @param {string} key
   * @param {V} value
   */
  set(key, value) {
    this.#entries.delete(key);
    if (this.#entries.size >= this.#max) {
      this.#entries.delete(/** @type {string} */ (this.#entries.keys().next().value));
    }
    this.#entries.set(key, { value, expires: this.#now() + this.#ttlMs });
  }

  /**
   * Return the cached value, or compute and store it. Concurrent callers share one in-flight
   * promise, and a rejected promise is dropped (unless the key was already replaced) so the next call retries.
   * @param {string} key
   * @param {() => V} compute
   * @returns {V}
   */
  getOrCompute(key, compute) {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const pending = /** @type {any} */ (compute()).catch((/** @type {unknown} */ error) => {
      if (this.#entries.get(key)?.value === pending) this.#entries.delete(key);
      throw error;
    });
    this.set(key, pending);
    return pending;
  }
}
