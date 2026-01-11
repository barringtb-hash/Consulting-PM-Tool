/**
 * Custom error for CORS rejections.
 *
 * This error is handled silently by the error middleware to avoid log noise
 * from bot traffic and probing requests. CORS blocks are security policy,
 * not application errors that need stack traces.
 */
export class CorsError extends Error {
  constructor(
    public requestedOrigin: string,
    public allowedOrigins: string[],
  ) {
    super('Not allowed by CORS');
    this.name = 'CorsError';
    Object.setPrototypeOf(this, CorsError.prototype);
  }
}
