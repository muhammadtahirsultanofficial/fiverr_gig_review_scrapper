# Fiverr Gig Review Extractor - Implementation Guide

This guide explains how to implement the actual scraping functionality for the Fiverr Gig Review Extractor.

## Prerequisites

To implement the actual scraping functionality, you'll need to:

1. Install additional dependencies:
```bash
npm install puppeteer cheerio
```

2. Set up a proper backend environment that can run headless browsers

## Implementation Steps

### 1. Update Dependencies

Add the required dependencies to your project:

```bash
npm install puppeteer cheerio
```

### 2. Enable Server-Side Execution

Since scraping requires server-side execution, ensure your scraper runs on the backend. The current API route (`app/api/extract-reviews/route.ts`) is the correct place to implement this.

### 3. Implement the Scraper Logic

Replace the mock implementation in `lib/scraper.ts` with the actual scraping logic:

```typescript
import puppeteer from 'puppeteer';
import { Review } from './types';

export async function extractFiverrReviews(url: string): Promise<Review[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Set a reasonable viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate to the gig page
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for the reviews section to load
    await page.waitForSelector('#reviews', { timeout: 10000 });
    
    // Scroll to reviews section to trigger loading
    await page.evaluate(() => {
      const reviewsSection = document.querySelector('#reviews');
      if (reviewsSection) {
        reviewsSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
    
    // Wait a bit for any initial reviews to load
    await page.waitForTimeout(3000);
    
    // Keep clicking "Load More" until all reviews are loaded
    let loadMoreAttempts = 0;
    const maxLoadMoreAttempts = 15;
    
    while (loadMoreAttempts < maxLoadMoreAttempts) {
      const loadMoreButton = await page.$('button[data-testid="load-more-reviews"]');
      
      if (loadMoreButton) {
        // Get current scroll height
        const previousHeight = await page.evaluate(() => document.body.scrollHeight);
        
        // Click the load more button
        await loadMoreButton.click();
        
        // Wait for new content to load
        await page.waitForTimeout(3000);
        
        // Check if content actually loaded
        const currentHeight = await page.evaluate(() => document.body.scrollHeight);
        
        // If height didn't change, we might be at the end
        if (currentHeight === previousHeight) {
          // Try once more to be sure
          await page.waitForTimeout(2000);
          const newHeight = await page.evaluate(() => document.body.scrollHeight);
          if (newHeight === currentHeight) {
            break;
          }
        }
        
        loadMoreAttempts++;
      } else {
        // No more load more button, we're done
        break;
      }
    }
    
    // Extract reviews
    const reviews: Review[] = await page.evaluate(() => {
      const reviewElements = document.querySelectorAll('[data-testid="review-card"]');
      const reviews: Review[] = [];
      
      reviewElements.forEach(element => {
        try {
          const reviewerElement = element.querySelector('[data-testid="review-buyer-name"]');
          const reviewer = reviewerElement ? reviewerElement.textContent?.trim() || '' : '';
          
          const ratingElement = element.querySelector('[data-testid="review-rating"]');
          const rating = ratingElement ? 
            parseInt(ratingElement.getAttribute('aria-label')?.match(/\d+/)?.[0] || '0') : 0;
          
          const textElement = element.querySelector('[data-testid="review-content"]');
          const text = textElement ? textElement.textContent?.trim() || '' : '';
          
          const dateElement = element.querySelector('[data-testid="review-date"]');
          const date = dateElement ? dateElement.textContent?.trim() || '' : '';
          
          // Only add reviews with essential information
          if (reviewer && rating > 0 && text) {
            reviews.push({
              reviewer,
              rating,
              text,
              date
            });
          }
        } catch (error) {
          console.error('Error extracting review:', error);
        }
      });
      
      return reviews;
    });
    
    await browser.close();
    return reviews;
  } catch (error) {
    await browser.close();
    throw error;
  }
}
```

### 4. Update the API Route

Uncomment the actual scraper calls in `app/api/extract-reviews/route.ts`:

```typescript
// Extract reviews using our scraper
const rawReviews = await extractFiverrReviews(url);
const reviews = deduplicateReviews(rawReviews);
```

### 5. Add Error Handling and Rate Limiting

Implement proper error handling and rate limiting to avoid being blocked by Fiverr:

```typescript
// Add to your API route
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "10 s"),
  analytics: true,
});
```

### 6. Environment Variables

Set up environment variables for configuration:

```env
# .env.local
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
REDIS_URL=your_redis_url
REDIS_TOKEN=your_redis_token
```

## Deployment Considerations

### Vercel

If deploying on Vercel, you'll need to use a different approach since Puppeteer doesn't work well on serverless functions due to size and execution time limits.

Consider:
1. Using API routes with larger timeouts
2. Moving scraping to a separate service
3. Using a dedicated scraping service like BrightData or ScrapingBee

### Alternative Approach with Cheerio

For simpler HTML parsing without JavaScript execution:

```typescript
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function extractFiverrReviewsWithCheerio(url: string): Promise<Review[]> {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    
    const reviews: Review[] = [];
    
    $('[data-testid="review-card"]').each((index, element) => {
      const reviewer = $(element).find('[data-testid="review-buyer-name"]').text().trim();
      const ratingText = $(element).find('[data-testid="review-rating"]').attr('aria-label') || '';
      const rating = parseInt(ratingText.match(/\d+/)?.[0] || '0');
      const text = $(element).find('[data-testid="review-content"]').text().trim();
      const date = $(element).find('[data-testid="review-date"]').text().trim();
      
      if (reviewer && rating > 0 && text) {
        reviews.push({ reviewer, rating, text, date });
      }
    });
    
    return reviews;
  } catch (error) {
    throw new Error(`Failed to fetch or parse page: ${error}`);
  }
}
```

## Legal and Ethical Considerations

1. **Compliance**: Ensure your scraping complies with Fiverr's Terms of Service
2. **Rate Limiting**: Implement appropriate delays between requests
3. **User Agent**: Use an appropriate user agent string
4. **Robots.txt**: Check Fiverr's robots.txt file for guidelines
5. **Data Usage**: Only use the data for legitimate purposes as permitted by law

## Testing

Test your implementation thoroughly:

1. With various gig URLs
2. With gigs that have many reviews
3. With gigs that have few/no reviews
4. With network timeouts
5. With CAPTCHA challenges

## Performance Optimization

1. Cache results to avoid repeated scraping
2. Implement pagination for large datasets
3. Use connection pooling for HTTP requests
4. Monitor memory usage with Puppeteer