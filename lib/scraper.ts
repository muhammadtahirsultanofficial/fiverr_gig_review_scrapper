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
 * Click "Show More Reviews" until all reviews are loaded
 * @param page - Puppeteer page instance
 */
async function loadAllReviews(page: any) {
  console.log('Loading all reviews...');
  let clickCount = 0;
  const maxClicks = 50; // Safety limit to prevent infinite loops
  
  while (clickCount < maxClicks) {
    try {
      // Wait a bit for any animations or loading
      await sleep(2000);
      
      // Scroll to the reviews section first
      await page.evaluate(() => {
        const reviewSection = document.querySelector('.reviews-section, [data-testid="reviews-section"], .gig-reviews');
        if (reviewSection) {
          reviewSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // Fallback to scrolling to bottom
          window.scrollTo(0, document.body.scrollHeight * 0.8);
        }
      });
      
      // Wait for scroll to complete
      await sleep(1000);
      
      // Look for the "Show More" button using multiple strategies
      const showMoreButton = await page.evaluateHandle(() => {
        // Try different selectors for the "Show More" button
        const selectors = [
          'button[data-testid="show-more-button"]',
          'button[class*="show-more"]',
          'button[class*="load-more"]',
          'button:enabled' // Generic enabled button as fallback
        ];
        
        // First try to find by text content
        const allButtons = document.querySelectorAll('button');
        for (let i = 0; i < allButtons.length; i++) {
          const button = allButtons[i] as HTMLButtonElement;
          const text = (button.textContent || '').toLowerCase().trim();
          if (text.includes('show more') || text.includes('load more') || text.includes('view more')) {
            // Check if button is visible and enabled
            const style = window.getComputedStyle(button);
            if (style.display !== 'none' && style.visibility !== 'hidden' && !button.disabled) {
              return button;
            }
          }
        }
        
        // Then try by selectors
        for (const selector of selectors) {
          const buttons = document.querySelectorAll(selector);
          for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i] as HTMLButtonElement;
            // Check if button is visible and enabled
            const style = window.getComputedStyle(button);
            if (style.display !== 'none' && style.visibility !== 'hidden' && !button.disabled) {
              const text = (button.textContent || '').toLowerCase().trim();
              if (text.includes('show more') || text.includes('load more') || text.includes('view more')) {
                return button;
              }
            }
          }
        }
        
        return null;
      });
      
      // If no button found, break the loop
      if (!showMoreButton || showMoreButton.asElement() === null) {
        console.log('No more "Show More" buttons found');
        break;
      }
      
      // Click the button
      console.log(`Clicking "Show More" button (click #${clickCount + 1})`);
      await showMoreButton.click();
      clickCount++;
      
      // Wait for new content to load
      await sleep(3000);
      
      // Scroll a bit to trigger any lazy loading
      await page.evaluate(() => {
        window.scrollBy(0, 300);
      });
      
      // Wait a bit more for rendering
      await sleep(2000);
    } catch (error) {
      console.log('Error clicking "Show More" button:', (error as Error).message);
      break;
    }
  }
  
  console.log(`Finished loading reviews after ${clickCount} clicks`);
  // Final wait to ensure all content is loaded
  await sleep(3000);
}

/**
 * Extract reviews safely with deduplication
 * @param page - Puppeteer page instance
 * @returns Array of reviews
 */
async function extractReviews(page: any): Promise<Review[]> {
  return await page.evaluate(() => {
    const results: any[] = [];
    const seen = new Set<string>();
    
    // Try multiple approaches to find review containers
    console.log('Attempting to find review elements...');
    
    // Approach 1: Look for specific review container classes
    const reviewContainerSelectors = [
      '[data-testid="review-item"]',
      '.review-item-component',
      '.carousel-review-item',
      '.review-list .review-item-component-wrapper',
      '.gig-page-reviews .review-item-component',
      '.reviews-wrap .review-item-component',
      '[class*="review"][class*="item"]',
      '[class*="review"][class*="card"]',
      '.review-container',
      '.feedback-item'
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
    
    // Approach 2: If we still don't have elements, look for elements with review-related class names
    if (reviewElements.length === 0) {
      console.log('Trying broader approach...');
      const allElements = Array.from(document.querySelectorAll('div, article, section'));
      const reviewClassPatterns = [
        'review', 'feedback', 'testimonial', 'carousel-review', 
        'review-item', 'review-component', 'review-card'
      ];
      
      reviewElements = allElements.filter(element => {
        const className = element.className || '';
        return reviewClassPatterns.some(pattern => 
          className.toLowerCase().includes(pattern));
      });
      
      console.log(`Found ${reviewElements.length} elements with review class patterns`);
    }
    
    // Approach 3: If still no elements, look for elements containing review-like text
    if (reviewElements.length === 0) {
      console.log('Trying text-based approach...');
      const allElements = Array.from(document.querySelectorAll('div, article, section'));
      reviewElements = allElements.filter(el => {
        const text = el.textContent || '';
        const hasStars = text.includes('★') || text.includes('☆');
        const hasReviewKeywords = text.toLowerCase().includes('review') || 
                                 text.toLowerCase().includes('feedback') ||
                                 text.toLowerCase().includes('excellent') ||
                                 text.toLowerCase().includes('great') ||
                                 text.toLowerCase().includes('perfect');
        return hasStars && hasReviewKeywords && text.length > 50;
      });
      
      console.log(`Found ${reviewElements.length} elements with review text patterns`);
    }
    
    // Deduplicate elements by their HTML content
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
    console.log(`Processing ${reviewElements.length} unique review elements`);
    
    reviewElements.forEach((el, index) => {
      try {
        console.log(`Processing review element #${index + 1}`);
        
        // Skip if this looks like a button container or pagination
        const elementText = (el.textContent || '').toLowerCase();
        if (elementText.includes('show more reviews') || 
            elementText.includes('load more') || 
            elementText.includes('see all') ||
            elementText.includes('view all')) {
          console.log('Skipping button/pagination element');
          return;
        }
        
        // Extract reviewer information using multiple strategies
        let reviewerName = '';
        
        // Strategy 1: Look for links with user URLs
        const userLink = el.querySelector('a[href*="/users/"]');
        if (userLink) {
          const href = userLink.getAttribute('href');
          if (href) {
            const match = href.match(/\/users\/([^\/\?#]+)/);
            if (match) {
              reviewerName = match[1];
            }
          }
        }
        
        // Strategy 2: Look for data-testid attributes
        if (!reviewerName) {
          const reviewerElement = el.querySelector('[data-testid="review-buyer-name"], [data-testid="buyer-username"]');
          if (reviewerElement) {
            reviewerName = reviewerElement.textContent?.trim() || '';
          }
        }
        
        // Strategy 3: Look for specific classes
        if (!reviewerName) {
          const reviewerSelectors = [
            '.reviewer-name',
            '.buyer-name',
            '.username',
            '[class*="reviewer"][class*="name"]',
            '[class*="buyer"][class*="name"]'
          ];
          
          for (const selector of reviewerSelectors) {
            const nameElement = el.querySelector(selector);
            if (nameElement && nameElement.textContent) {
              reviewerName = nameElement.textContent.trim();
              break;
            }
          }
        }
        
        // Strategy 4: Look for text that looks like a username (no spaces, not too long)
        if (!reviewerName) {
          // Get all text nodes and find ones that look like usernames
          const allText = el.textContent || '';
          const textNodes = allText.split(/\s+/);
          for (const node of textNodes) {
            // Simple validation - usernames are usually shorter and don't contain country names
            if (node.length > 2 && node.length < 30 && 
                !node.includes(' ') && 
                !/[0-9]/.test(node) &&
                !['stars', 'star', 'review', 'reviews', 'feedback', 'excellent', 'great', 'perfect'].includes(node.toLowerCase())) {
              // Check if it's not a country name
              const countryIndicators = ['united', 'kingdom', 'states', 'america', 'canada', 'australia', 'germany', 'france', 'italy', 'spain'];
              if (!countryIndicators.some(indicator => node.toLowerCase().includes(indicator))) {
                reviewerName = node;
                break;
              }
            }
          }
        }
        
        // Extract country information
        let country = '';
        const countryElement = el.querySelector('[class*="flag"], img[alt*="flag"], [data-testid="country-name"]');
        if (countryElement) {
          country = countryElement.getAttribute('alt') || 
                   countryElement.getAttribute('title') || 
                   countryElement.textContent?.trim() || 
                   countryElement.getAttribute('data-testid') === 'country-name' ? countryElement.textContent?.trim() || '' : '';
        }
        
        // Extract rating using multiple strategies
        let rating = 0;
        
        // Strategy 1: Look for aria-label with rating info
        const ratingElement = el.querySelector('[aria-label*="out of"], [aria-label*="star"]');
        if (ratingElement) {
          const ariaLabel = ratingElement.getAttribute('aria-label') || '';
          const match = ariaLabel.match(/(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*(\d+(?:\.\d+)?)/i);
          if (match) {
            rating = parseFloat(match[1]);
          }
        }
        
        // Strategy 2: Count star elements if no aria-label worked
        if (rating === 0) {
          // Look for SVG stars
          const starElements = el.querySelectorAll('svg, [class*="star"]');
          let filledStars = 0;
          
          starElements.forEach(star => {
            const html = star.outerHTML || '';
            // Check for filled star indicators
            if (html.includes('fill') || html.includes('★') || 
                html.includes('full') || html.includes('active') ||
                html.includes('star-fill') || html.includes('star-filled')) {
              filledStars++;
            }
          });
          
          rating = Math.min(5, filledStars);
        }
        
        // Strategy 3: Look for text-based rating
        if (rating === 0) {
          const ratingText = el.textContent || '';
          const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*(\d+(?:\.\d+)?)/i);
          if (ratingMatch) {
            rating = Math.round(parseFloat(ratingMatch[1]));
          }
        }
        
        // Extract review text
        let reviewText = '';
        
        // Strategy 1: Look for specific data-testid or classes
        const textSelectors = [
          '[data-testid="review-content"]',
          '[data-testid="review-comment"]',
          '.review-item-description',
          '.review-description',
          '.review-text',
          '.comment'
        ];
        
        for (const selector of textSelectors) {
          const textElement = el.querySelector(selector);
          if (textElement && textElement.textContent) {
            const content = textElement.textContent.trim();
            // Filter out short texts and button text
            if (content.length > 10 && 
                !content.toLowerCase().includes('show more') && 
                !content.toLowerCase().includes('load more') &&
                !content.toLowerCase().includes('see all') &&
                !content.toLowerCase().includes('view all') &&
                content.length < 2000) {
              reviewText = content;
              break;
            }
          }
        }
        
        // Strategy 2: Look for paragraph elements
        if (!reviewText) {
          const pElements = el.querySelectorAll('p');
          for (const p of pElements) {
            const content = p.textContent?.trim() || '';
            if (content.length > 20 && content.length < 2000) {
              reviewText = content;
              break;
            }
          }
        }
        
        // Extract date
        let date = '';
        
        // Strategy 1: Look for time elements
        const timeElement = el.querySelector('time');
        if (timeElement) {
          date = timeElement.getAttribute('datetime') || timeElement.textContent?.trim() || '';
        }
        
        // Strategy 2: Look for date-related classes
        if (!date) {
          const dateSelectors = [
            '[data-testid="review-date"]',
            '.review-date',
            '.date',
            '[class*="date"]',
            '.timestamp'
          ];
          
          for (const selector of dateSelectors) {
            const dateElement = el.querySelector(selector);
            if (dateElement && dateElement.textContent) {
              date = dateElement.textContent.trim();
              break;
            }
          }
        }
        
        console.log(`Extracted - Reviewer: ${reviewerName}, Rating: ${rating}, Text: ${reviewText.substring(0, 30)}..., Date: ${date}, Country: ${country}`);
        
        // Create a stable key for deduplication
        const key = `${reviewerName}|${reviewText.slice(0, 50)}|${date}`;
        
        // Skip if we've seen this review before
        if (seen.has(key)) {
          console.log('Skipping duplicate review');
          return;
        }
        
        // Validate that we have essential information
        if (reviewerName && rating > 0 && reviewText) {
          seen.add(key);
          results.push({
            reviewer: reviewerName,
            rating: rating,
            text: reviewText,
            date: date,
            country: country
          });
          console.log('Added review to results');
        } else {
          console.log('Skipped review due to missing essential information');
        }
      } catch (error) {
        console.error('Error extracting review:', error);
      }
    });
    
    console.log(`Extracted ${results.length} unique reviews`);
    return results;
  });
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

    console.log(`Total reviews extracted: ${reviews.length}`);
     
    
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
    headless: false, // Run in headless mode for production
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
    
    // Scroll down to trigger lazy loading of reviews section
    console.log('Scrolling to load reviews section...');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight * 0.7);
    });
    await sleep(3000);
    
    // Load all reviews by clicking "Show More" buttons
    await loadAllReviews(page);
    
    // Final scroll to bottom to ensure everything is loaded
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await sleep(3000);
    
    console.log('Extracting reviews...');
    // Extract reviews using the improved extraction function
    const reviews: Review[] = await extractReviews(page);
    
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