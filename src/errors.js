/** An error that is safe to show to the client. */
export class HttpError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} message client-safe message
   */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
