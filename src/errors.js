// @ts-check
/** An error whose message is safe to show to the client. */
export class HttpError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} message client-safe message
   * @param {ErrorOptions} [options]
   */
  constructor(status, message, options) {
    super(message, options);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** A failure talking to Google (Maps APIs or Gemini). Its message is for logs, never for clients. */
export class UpstreamError extends Error {
  /**
   * @param {string} message
   * @param {ErrorOptions} [options]
   */
  constructor(message, options) {
    super(message, options);
    this.name = 'UpstreamError';
  }
}
