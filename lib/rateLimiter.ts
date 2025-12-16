// Simple in-memory rate limiter for demonstration purposes
// In production, use Redis or a similar distributed store

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 5) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if a client has exceeded the rate limit
   * @param clientId - Unique identifier for the client (IP address, user ID, etc.)
   * @returns True if rate limited, false otherwise
   */
  isRateLimited(clientId: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(clientId);

    // If no entry exists or the window has expired, create a new one
    if (!entry || entry.resetTime <= now) {
      this.limits.set(clientId, {
        count: 1, // Start with 1 since this is the first request
        resetTime: now + this.windowMs
      });
      return false;
    }

    // Check if the limit has been exceeded
    if (entry.count >= this.maxRequests) {
      return true;
    }

    // Increment the count for subsequent requests
    entry.count++;
    return false;
  }

  /**
   * Get the number of requests remaining for a client
   * @param clientId - Unique identifier for the client
   * @returns Number of requests remaining
   */
  getRemainingRequests(clientId: string): number {
    const entry = this.limits.get(clientId);
    if (!entry || entry.resetTime <= Date.now()) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  /**
   * Get the time remaining until the rate limit resets
   * @param clientId - Unique identifier for the client
   * @returns Time remaining in milliseconds
   */
  getTimeRemaining(clientId: string): number {
    const entry = this.limits.get(clientId);
    if (!entry || entry.resetTime <= Date.now()) {
      return 0;
    }
    return entry.resetTime - Date.now();
  }

  /**
   * Reset the rate limit for a client
   * @param clientId - Unique identifier for the client
   */
  reset(clientId: string): void {
    this.limits.delete(clientId);
  }

  /**
   * Clean up expired entries periodically
   */
  cleanup(): void {
    const now = Date.now();
    for (const [clientId, entry] of this.limits.entries()) {
      if (entry.resetTime <= now) {
        this.limits.delete(clientId);
      }
    }
  }
}

// Create a global rate limiter instance
const rateLimiter = new RateLimiter(60000, 5); // 5 requests per minute

// Periodically clean up expired entries
setInterval(() => {
  rateLimiter.cleanup();
}, 30000); // Every 30 seconds

export default rateLimiter;