import { NextResponse } from 'next/server';
import { extractFiverrReviewsWithFallback } from '@/lib/scraper';
import { deduplicateReviews } from '@/lib/scraper';
import rateLimiter from '@/lib/rateLimiter';
import { Review } from '@/lib/types';

export async function POST(request: Request) {
  // Get client IP for rate limiting
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
  
  // Check rate limit
  if (rateLimiter.isRateLimited(clientIP)) {
    const timeRemaining = rateLimiter.getTimeRemaining(clientIP);
    const minutes = Math.ceil(timeRemaining / 60000);
    
    return NextResponse.json(
      { 
        error: `Rate limit exceeded. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
        retryAfter: timeRemaining
      },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil(timeRemaining / 1000).toString()
        }
      }
    );
  }

  try {
    const { url } = await request.json();
    
    // Validate URL
    if (!url || !url.includes('fiverr.com')) {
      return NextResponse.json(
        { error: 'Please provide a valid Fiverr URL' },
        { status: 400 }
      );
    }
    
    // Extract reviews using our scraper with fallback
    const rawReviews = await extractFiverrReviewsWithFallback(url);
    const reviews = deduplicateReviews(rawReviews);
    
    return NextResponse.json({ reviews });
  } catch (error: any) {
    console.error('Error extracting reviews:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract reviews. Please try again later.' },
      { status: 500 }
    );
  }
}