import { Review } from './types';
import puppeteer from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Fiverr Scraper Utility
 * 
 * This module contains functions for scraping Fiverr gig reviews.
 * Note: This implementation requires proper setup for production use:
 * - Rate limiting
 * - CAPTCHA detection
 * - Dynamic content loading
 * - Error handling
 * - Compliance with Fiverr's Terms of Service
 */

// Add rate limiting constant
const REQUEST_DELAY = 2000; // 2 seconds between requests

/**
 * Sleep function to replace waitForTimeout
 * @param ms - milliseconds to sleep
 * @returns Promise that resolves after ms milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract reviews from a Fiverr gig page with fallback mechanisms
 * @param url - The Fiverr gig URL
 * @returns Promise resolving to an array of reviews
 */
export async function extractFiverrReviewsWithFallback(url: string): Promise<Review[]> {
  try {
    // First try the main Puppeteer scraper
    console.log('Attempting to extract reviews with Puppeteer...');
    const reviews = await extractFiverrReviews(url);

    console.log(`Total reviews extracted: ${reviews}`);
     
    
    // If we got reviews, return them
    if (reviews.length > 0) {
      console.log(`Successfully extracted ${reviews.length} reviews with Puppeteer`);
      return reviews;
    }
    
    // If no reviews, try the static scraper as fallback
    console.log('No reviews found with Puppeteer, trying static scraper...');
    const staticReviews = await extractFiverrReviewsStatic(url);
    
    if (staticReviews.length > 0) {
      console.log(`Successfully extracted ${staticReviews.length} reviews with static scraper`);
      return staticReviews;
    }
    
    // If still no reviews, return empty array
    console.log('No reviews found with either method');
    return [];
  } catch (error) {
    console.error('Error in primary extraction method:', error);
    
    try {
      // Try the static scraper as fallback
      console.log('Attempting fallback to static scraper...');
      const staticReviews = await extractFiverrReviewsStatic(url);
      
      if (staticReviews.length > 0) {
        console.log(`Successfully extracted ${staticReviews.length} reviews with static scraper (fallback)`);
        return staticReviews;
      }
    } catch (fallbackError) {
      console.error('Error in fallback extraction method:', fallbackError);
    }
    
    // If both methods failed, rethrow the original error
    throw error;
  }
}

/**
 * Extract reviews from a Fiverr gig page using Puppeteer (headless browser)
 * @param url - The Fiverr gig URL
 * @returns Promise resolving to an array of reviews
 */
async function extractFiverrReviews(url: string): Promise<Review[]> {
  // Validate URL
  if (!url || !url.includes('fiverr.com')) {
    throw new Error('Invalid Fiverr URL');
  }

  console.log(`Starting extraction for URL: ${url}`);

  const browser = await puppeteer.launch({
    headless: false, // Keep visible for CAPTCHA handling
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
      '--disable-extensions',
      '--disable-plugins'
    ]
  });
  
  const page = await browser.newPage();
  
  try {
    // Set user agent to mimic a real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set a reasonable viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Override webdriver property to help avoid bot detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });
    
    console.log('Navigating to page...');
    // Navigate to the gig page
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('Page loaded, waiting for content...');
    // Wait a bit for initial content to load
    await sleep(5000);
    
    // Check if we're facing a CAPTCHA challenge
    const pageTitle = await page.title();
    if (pageTitle.includes('human') || pageTitle.includes('touch') || pageTitle.includes('CAPTCHA') || pageTitle.includes('Security')) {
      console.log('CAPTCHA detected. Waiting for manual resolution (you have 2 minutes)...');
      try {
        // Wait for user to manually solve CAPTCHA (up to 2 minutes)
        await page.waitForFunction(() => {
          const title = document.title.toLowerCase();
          return !title.includes('human') && !title.includes('touch') && !title.includes('captcha') && !title.includes('security');
        }, { timeout: 120000 });
        console.log('CAPTCHA resolved, continuing extraction...');
      } catch (timeoutError) {
        console.log('CAPTCHA timeout - continuing anyway...');
      }
    }
    
    // Wait a bit after CAPTCHA resolution
    await sleep(3000);
    
    // Scroll down multiple times to trigger lazy loading
    console.log('Scrolling to load reviews...');
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await sleep(1500);
    }
    
    // Scroll to the bottom to trigger all lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Wait for content to load after scrolling
    await sleep(5000);
    
    // Try to find and click "See all reviews" or "Show More" buttons
    console.log('Looking for review buttons...');
    try {
      // Look for "See all reviews" button first
      const seeAllButtons = await page.$$('button');
      for (const button of seeAllButtons) {
        const buttonText = await page.evaluate(el => el.textContent, button);
        if (buttonText && buttonText.toLowerCase().includes('see all')) {
          console.log(`Clicking "See all reviews" button: ${buttonText}`);
          await button.click();
          await sleep(5000);
          break;
        }
      }
      
      // Then look for "Show More" buttons
      const showMoreButtons = await page.$$('button');
      for (const button of showMoreButtons) {
        const buttonText = await page.evaluate(el => el.textContent, button);
        if (buttonText && 
            (buttonText.toLowerCase().includes('show more') || 
             buttonText.toLowerCase().includes('load more'))) {
          console.log(`Clicking "Show More" button: ${buttonText}`);
          await button.click();
          await sleep(5000);
          
          // Scroll after clicking
          await page.evaluate(() => {
            window.scrollBy(0, 500);
          });
          await sleep(3000);
        }
      }
    } catch (error) {
      console.log('Error clicking review buttons:', (error as Error).message);
    }
    
    // Final scroll to bottom
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await sleep(5000);
    
    console.log('Extracting reviews...');
    // Extract reviews using Fiverr-specific selectors
    const reviews: Review[] = await page.evaluate(() => {
      // Fiverr-specific review selectors we identified
      const reviewContainerSelectors = [
        '.review-item-component',
        '.carousel-review-item',
        '.review-list .review-item-component-wrapper',
        '.gig-page-reviews .review-item-component',
        '.reviews-wrap .review-item-component'
      ];
      
      let reviewElements: Element[] = [];
      
      // Try each selector
      for (const selector of reviewContainerSelectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          reviewElements = reviewElements.concat(elements);
        }
      }
      
      // If we still don't have elements, try a broader approach
      if (reviewElements.length === 0) {
        console.log('Trying broader approach...');
        // Look for elements with review-related class names
        const allElements = Array.from(document.querySelectorAll('*'));
        const reviewClassPatterns = [
          'review', 'feedback', 'testimonial', 'carousel-review', 
          'review-item', 'review-component'
        ];
        
        allElements.forEach(element => {
          const className = element.className || '';
          const hasReviewClass = reviewClassPatterns.some(pattern => 
            className.toLowerCase().includes(pattern));
          
          if (hasReviewClass) {
            reviewElements.push(element);
          }
        });
      }
      
      // Deduplicate elements
      const uniqueElements: Element[] = [];
      const seenHTML = new Set<string>();
      
      reviewElements.forEach(element => {
        const html = element.outerHTML;
        if (!seenHTML.has(html)) {
          seenHTML.add(html);
          uniqueElements.push(element);
        }
      });
      
      reviewElements = uniqueElements;
      console.log(`Found ${reviewElements.length} potential review elements`);
      
      const reviews: Review[] = [];
      
      // Process each potential review element
      reviewElements.forEach((element) => {
        try {
          // Skip if this looks like a button container
          const elementText = element.textContent || '';
          if (elementText.includes('Show More Reviews') || 
              elementText.includes('Load More') || 
              elementText.includes('See All') ||
              elementText.includes('View All')) {
            return;
          }
          
          // Extract reviewer name
          let reviewer = '';
          // Try specific Fiverr reviewer selectors
          const reviewerSelectors = [
            '.reviewer-name',
            '.buyer-name',
            '[class*="reviewer"]',
            '[class*="buyer"]'
          ];
          
          for (const selector of reviewerSelectors) {
            const nameElement = element.querySelector(selector);
            if (nameElement && nameElement.textContent) {
              reviewer = nameElement.textContent.trim();
              break;
            }
          }
          
          // If still no reviewer, look for text that looks like a name
          if (!reviewer) {
            const textNodes = element.textContent || '';
            // Simple pattern for names (capitalized words)
            const nameMatch = textNodes.match(/[A-Z][a-z]+ [A-Z][a-z]+/);
            if (nameMatch) {
              reviewer = nameMatch[0];
            }
          }
          
          // Extract rating
          let rating = 0;
          // Look for star elements
          const starElements = element.querySelectorAll('svg');
          if (starElements.length > 0) {
            // Count filled stars
            let filledStars = 0;
            starElements.forEach(star => {
              const html = star.outerHTML;
              // Check for filled star indicators
              if (html.includes('fill') || html.includes('★') || 
                  html.includes('full') || html.includes('active') ||
                  html.includes('star-fill') || html.includes('star-filled')) {
                filledStars++;
              }
            });
            rating = Math.min(5, filledStars);
          }
          
          // If no star-based rating, look for text-based rating
          if (rating === 0) {
            const ratingText = element.textContent || '';
            const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*(\d+(?:\.\d+)?)/i);
            if (ratingMatch) {
              rating = Math.round(parseFloat(ratingMatch[1]));
            }
          }
          
          // Extract review text
          let text = '';
          // Try specific Fiverr review text selectors
          const textSelectors = [
            '.review-item-description',
            '.review-description',
            '.review-text',
            'p'
          ];
          
          for (const selector of textSelectors) {
            const textElements = element.querySelectorAll(selector);
            for (const textElement of textElements) {
              const content = textElement.textContent || '';
              // Filter out short texts and button text
              if (content.length > 20 && 
                  !content.includes('Show More') && 
                  !content.includes('Load More') &&
                  !content.includes('See All') &&
                  !content.includes('View All') &&
                  content.length < 1000) {
                text = content.trim();
                break;
              }
            }
            if (text) break;
          }
          
          // Extract date
          let date = '';
          // Try specific Fiverr date selectors
          const dateSelectors = [
            'time',
            '[class*="date"]',
            '[class*="time"]'
          ];
          
          for (const selector of dateSelectors) {
            const dateElement = element.querySelector(selector);
            if (dateElement) {
              date = dateElement.textContent?.trim() || dateElement.getAttribute('datetime') || '';
              break;
            }
          }
          
          // Extract country flag (if present)
          let country = '';
          const flagElement = element.querySelector('[class*="flag"], img[alt*="flag"]');
          if (flagElement) {
            country = flagElement.getAttribute('alt') || flagElement.getAttribute('title') || '';
          }
          
          // Only add reviews with essential information
          if (reviewer && rating > 0 && text) {
            const review: Review = {
              reviewer,
              rating,
              text,
              date
            };
            
            // Add country if available
            if (country) {
              (review as any).country = country;
            }
            
            reviews.push(review);
          }
        } catch (error) {
          console.error('Error extracting review:', error);
        }
      });
      
      // Remove duplicates
      const uniqueReviews: Review[] = [];
      const seen = new Set<string>();
      
      reviews.forEach(review => {
        const identifier = `${review.reviewer}-${review.text.substring(0, 30)}`;
        if (!seen.has(identifier)) {
          seen.add(identifier);
          uniqueReviews.push(review);
        }
      });
      
      console.log(`Total unique reviews extracted: ${uniqueReviews.length}`);
      return uniqueReviews;
    });
    
    console.log(`Successfully extracted ${reviews.length} reviews`);
    await browser.close();
    return reviews;
  } catch (error) {
    console.error('Error during extraction:', error);
    await browser.close();
    throw new Error(`Failed to extract reviews: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Alternative scraper using Cheerio for static HTML parsing (faster but less reliable)
 * @param url - The Fiverr gig URL
 * @returns Promise resolving to an array of reviews
 */
async function extractFiverrReviewsStatic(url: string): Promise<Review[]> {
  try {
    // Validate URL
    if (!url || !url.includes('fiverr.com')) {
      throw new Error('Invalid Fiverr URL');
    }
    
    console.log(`Starting static extraction for URL: ${url}`);
    
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(data);
    
    console.log('Page loaded, looking for reviews...');
    
    // Check if we're facing a CAPTCHA challenge
    const title = $('title').text();
    if (title.includes('human') || title.includes('touch') || title.includes('CAPTCHA')) {
      console.log('CAPTCHA detected in static scraper. Cannot proceed without solving it.');
      return [];
    }
    
    const reviews: Review[] = [];
    
    // Look for review containers by examining the HTML structure
    // Fiverr typically has reviews in div elements with certain characteristics
    $('div, article, section').each((index, element) => {
      try {
        const $element = $(element);
        const text = $element.text();
        
        // Check if this element looks like a review container
        const hasStars = text.includes('★') || text.includes('☆') || 
                        $element.find('[class*="star"]').length > 0 ||
                        $element.find('[aria-label*="star"]').length > 0;
        
        const hasAvatar = $element.find('img[alt*="avatar"], [class*="avatar"]').length > 0;
        const hasDate = $element.find('time, [class*="date"], [data-testid*="date"]').length > 0;
        
        const hasReviewIndicators = text.length > 30 && 
                                  (text.includes('review') || text.includes('feedback') || 
                                   text.includes('great') || text.includes('good') || 
                                   text.includes('excellent') || text.includes('amazing') ||
                                   text.includes('perfect') || text.includes('wonderful'));
        
        // Avoid elements that contain navigation or header content
        const isNavigation = $element.find('nav, header, footer').length > 0;
        const isMenu = text.toLowerCase().includes('menu') || 
                      text.toLowerCase().includes('navigation') ||
                      text.toLowerCase().includes('categories');
        
        // More specific criteria for identifying reviews
        if (hasStars && hasReviewIndicators && hasAvatar && hasDate && !isNavigation && !isMenu) {
          // Extract reviewer name
          let reviewer = '';
          const reviewerSelectors = [
            '[data-testid="review-buyer-name"]',
            '.reviewer-name',
            '.username',
            '.buyer-name',
            '[class*="username"]',
            '[class*="reviewer"]',
            '[class*="name"]'
          ];
          
          for (const selector of reviewerSelectors) {
            const el = $element.find(selector);
            if (el.length > 0 && el.text().trim()) {
              reviewer = el.text().trim();
              break;
            }
          }
          
          // If we still don't have a reviewer, try to find any text that looks like a name
          if (!reviewer) {
            // Look for text that looks like a name (capitalized words)
            const nameMatches = text.match(/[A-Z][a-z]+ [A-Z][a-z]+/);
            if (nameMatches && nameMatches[0]) {
              reviewer = nameMatches[0];
            }
          }
          
          // Extract rating
          let rating = 0;
          const ratingSelectors = [
            '[data-testid="review-rating"]',
            '.rating',
            '[class*="rating"]',
            '[aria-label*="rating"]',
            '[aria-label*="star"]',
            '[class*="star"]'
          ];
          
          for (const selector of ratingSelectors) {
            const ratingElement = $element.find(selector);
            if (ratingElement.length > 0) {
              const ariaLabel = ratingElement.attr('aria-label');
              if (ariaLabel) {
                const ratingMatch = ariaLabel.match(/(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*(\d+(?:\.\d+)?)/i);
                if (ratingMatch) {
                  rating = Math.round(parseFloat(ratingMatch[1]));
                  break;
                }
              }
              
              const ratingText = ratingElement.text();
              const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*(\d+(?:\.\d+)?)/i);
              if (ratingMatch) {
                rating = Math.round(parseFloat(ratingMatch[1]));
                break;
              }
            }
          }
          
          // If we couldn't parse a rating, try counting star elements
          if (rating === 0) {
            const starCount = $element.find('[class*="star"], svg').length;
            rating = Math.min(5, starCount); // Cap at 5 stars
          }
          
          // Extract review text
          let textContent = '';
          const textSelectors = [
            '[data-testid="review-content"]',
            '.review-content',
            '.review-text',
            '.comment',
            'p:not(:empty)',
            '[class*="content"]',
            '[class*="text"]'
          ];
          
          for (const selector of textSelectors) {
            const textElement = $element.find(selector);
            if (textElement.length > 0 && textElement.text().trim()) {
              const content = textElement.text().trim();
              // Only use this as review text if it's substantial and not navigation text
              if (content.length > 20 && 
                  !content.includes('Show More') && 
                  !content.includes('Load More') &&
                  !content.includes('See All')) {
                textContent = content;
                break;
              }
            }
          }
          
          // Extract date
          let date = '';
          const dateSelectors = [
            '[data-testid="review-date"]',
            '.review-date',
            '.date',
            'time',
            '[class*="date"]',
            '.timestamp'
          ];
          
          for (const selector of dateSelectors) {
            const dateElement = $element.find(selector);
            if (dateElement.length > 0 && dateElement.text().trim()) {
              date = dateElement.text().trim();
              break;
            }
            
            // Also check for datetime attribute
            const datetimeAttr = dateElement.attr('datetime');
            if (dateElement.length > 0 && datetimeAttr) {
              date = datetimeAttr;
              break;
            }
          }
          
          // Extract country flag (if present)
          let country = '';
          const flagElement = $element.find('[class*="flag"], img[alt*="flag"]');
          if (flagElement.length > 0) {
            const altText = flagElement.attr('alt') || '';
            if (altText) {
              country = altText;
            }
          }
          
          // Only add reviews with essential information
          if (reviewer && rating > 0 && textContent) {
            const review: Review = {
              reviewer,
              rating,
              text: textContent,
              date
            };
            
            // Add country if available
            if (country) {
              (review as any).country = country;
            }
            
            reviews.push(review);
          }
        }
      } catch (error) {
        console.error('Error extracting review from element:', error);
      }
    });
    
    // Remove duplicates
    const uniqueReviews: Review[] = [];
    const seen = new Set<string>();
    
    reviews.forEach(review => {
      const identifier = `${review.reviewer}-${review.text.substring(0, 30)}`;
      if (!seen.has(identifier)) {
        seen.add(identifier);
        uniqueReviews.push(review);
      }
    });
    
    console.log(`Successfully extracted ${uniqueReviews.length} reviews with static scraper`);
    return uniqueReviews;
  } catch (error) {
    console.error('Error during static extraction:', error);
    throw new Error(`Failed to fetch or parse page: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Remove duplicate reviews
 * @param reviews - Array of reviews
 * @returns Array of unique reviews
 */
export function deduplicateReviews(reviews: Review[]): Review[] {
  const seen = new Set<string>();
  const uniqueReviews: Review[] = [];
  
  for (const review of reviews) {
    // Create a unique identifier for the review
    const identifier = `${review.reviewer}-${review.text}-${review.date}`;
    
    if (!seen.has(identifier)) {
      seen.add(identifier);
      uniqueReviews.push(review);
    }
  }
  
  return uniqueReviews;
}

/**
 * Convert reviews to CSV format
 * @param reviews - Array of reviews
 * @returns CSV string
 */
export function reviewsToCSV(reviews: Review[]): string {
  const headers = ["Reviewer Name", "Rating", "Review Text", "Review Date", "Country"];
  const csvContent = [
    headers.join(","),
    ...reviews.map(review => 
      `"${review.reviewer.replace(/"/g, '""')}",${review.rating},"${review.text.replace(/"/g, '""')}","${review.date}","${(review as any).country || ''}"`
    )
  ].join("\n");
  
  return csvContent;
}