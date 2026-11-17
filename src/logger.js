// @ts-check
/**
 * Structured JSON logging. Cloud Run's logging agent reads `severity` and `message` from each line.
 * @typedef {{severity: 'INFO' | 'WARNING' | 'ERROR', message: string, [field: string]: unknown}} LogEntry
 */

/** @param {LogEntry} entry */
export function log(entry) {
  const stream = entry.severity === 'INFO' ? process.stdout : process.stderr;
  stream.write(`${JSON.stringify(entry)}\n`);
}

/** @param {LogEntry['severity']} severity */
const at =
  (severity) =>
  (/** @type {string} */ message, /** @type {Record<string, unknown>} */ fields = {}) =>
    log({ ...fields, severity, message });

export const logger = { info: at('INFO'), warn: at('WARNING'), error: at('ERROR') };
