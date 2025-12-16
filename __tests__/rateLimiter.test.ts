import rateLimiter from '../lib/rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    // Reset the rate limiter before each test
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Clear all entries
    (rateLimiter as any).limits.clear();
    jest.useRealTimers();
  });

  it('should allow requests within the limit', () => {
    const clientId = 'test-client';
    const maxRequests = 5;
    
    // First request should be allowed
    expect(rateLimiter.isRateLimited(clientId)).toBe(false);
    
    // Make maxRequests-1 more allowed requests
    for (let i = 1; i < maxRequests; i++) {
      expect(rateLimiter.isRateLimited(clientId)).toBe(false);
    }
    
    // Next request should be blocked
    expect(rateLimiter.isRateLimited(clientId)).toBe(true);
  });

  it('should block requests exceeding the limit', () => {
    const clientId = 'test-client';
    const maxRequests = 5;
    
    // Make maxRequests allowed requests
    for (let i = 0; i < maxRequests; i++) {
      expect(rateLimiter.isRateLimited(clientId)).toBe(false);
    }
    
    // Next request should be blocked
    expect(rateLimiter.isRateLimited(clientId)).toBe(true);
  });

  it('should reset after the time window expires', () => {
    const clientId = 'test-client';
    const windowMs = 60000; // 1 minute
    
    // Block the client
    for (let i = 0; i < 10; i++) {
      rateLimiter.isRateLimited(clientId);
    }
    
    // Should be blocked now
    expect(rateLimiter.isRateLimited(clientId)).toBe(true);
    
    // Advance time past the window
    jest.advanceTimersByTime(windowMs + 1000);
    
    // Should be allowed again
    expect(rateLimiter.isRateLimited(clientId)).toBe(false);
  });

  it('should track remaining requests correctly', () => {
    const clientId = 'test-client';
    const maxRequests = 5;
    
    // Initially should have all requests remaining
    expect(rateLimiter.getRemainingRequests(clientId)).toBe(maxRequests);
    
    // Make the first request
    rateLimiter.isRateLimited(clientId);
    
    // Should have fewer requests remaining
    expect(rateLimiter.getRemainingRequests(clientId)).toBe(maxRequests - 1);
  });

  it('should handle multiple clients independently', () => {
    const client1 = 'client-1';
    const client2 = 'client-2';
    const maxRequests = 5;
    
    // Block client 1
    for (let i = 0; i < maxRequests; i++) {
      rateLimiter.isRateLimited(client1);
    }
    
    // Client 1 should be blocked
    expect(rateLimiter.isRateLimited(client1)).toBe(true);
    
    // Client 2 should still be allowed
    expect(rateLimiter.isRateLimited(client2)).toBe(false);
  });
});