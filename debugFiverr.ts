import puppeteer from 'puppeteer';

// Sleep function to replace waitForTimeout
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function debugFiverrPage(url: string) {
  console.log(`Debugging Fiverr page: ${url}`);
  
  const browser = await puppeteer.launch({
    headless: false, // Run in non-headless mode to see what's happening
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
  
  const page = await browser.newPage();
  
  try {
    // Set user agent to mimic a real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Set a reasonable viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('Navigating to page...');
    // Navigate to the gig page
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('Page loaded, waiting 10 seconds for everything to load...');
    await sleep(10000);
    
    // Scroll down to trigger lazy loading
    console.log('Scrolling down to trigger lazy loading...');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    console.log('Waiting 5 more seconds...');
    await sleep(5000);
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Get all class names in the document
    const classNames = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      const classes = new Set<string>();
      
      allElements.forEach(el => {
        if (el.className && typeof el.className === 'string') {
          el.className.split(' ').forEach(cls => {
            if (cls) classes.add(cls);
          });
        }
      });
      
      return Array.from(classes);
    });
    
    console.log('Class names found in document (first 100):');
    console.log(classNames.slice(0, 100));
    
    // Look for review-related elements
    const reviewElements = await page.evaluate(() => {
      const selectors = [
        '[data-testid="review-card"]',
        '.review-item',
        '.review',
        '[class*="review"]',
        '.feedback-item',
        '.feedback',
        '[class*="feedback"]',
        '[data-testid="reviews-section"]',
        '#reviews',
        '.reviews-section',
        '[class*="comment"]',
        '[class*="testimonial"]'
      ];
      
      const results: {selector: string, count: number, sampleText: string}[] = [];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          const sampleElement = elements[0];
          const sampleText = sampleElement.textContent ? 
            sampleElement.textContent.substring(0, 100) : 
            'No text content';
          
          results.push({
            selector, 
            count: elements.length,
            sampleText
          });
        }
      });
      
      return results;
    });
    
    console.log('Review elements found:');
    console.log(reviewElements);
    
    // Look for "Show More" buttons
    const buttons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const showMoreButtons = buttons.filter(btn => {
        const text = (btn.textContent || '').toLowerCase();
        return text.includes('show') && text.includes('more') || 
               text.includes('load') && text.includes('more') ||
               text.includes('see') && text.includes('more') ||
               btn.getAttribute('data-track-tag') === 'button';
      });
      
      return showMoreButtons.map(btn => ({
        text: btn.textContent,
        className: btn.className,
        attributes: Array.from(btn.attributes).map(attr => ({name: attr.name, value: attr.value}))
      }));
    });
    
    console.log('"Show More" buttons found:');
    console.log(buttons);
    
    // Look for any elements with star ratings
    const starElements = await page.evaluate(() => {
      const stars = Array.from(document.querySelectorAll('*')).filter(el => {
        return el.className.includes('star') || 
               el.textContent?.includes('★') ||
               el.textContent?.includes('☆') ||
               el.getAttribute('aria-label')?.includes('star');
      });
      
      return stars.map(el => ({
        tagName: el.tagName,
        className: el.className,
        textContent: el.textContent?.substring(0, 50),
        ariaLabel: el.getAttribute('aria-label')
      })).slice(0, 10);
    });
    
    console.log('Star elements found:');
    console.log(starElements);
    
    // Take a screenshot
    await page.screenshot({ path: 'fiverr-debug.png', fullPage: true });
    console.log('Screenshot saved as fiverr-debug.png');
    
  } catch (error) {
    console.error('Error during debugging:', error);
  } finally {
    // Don't close the browser automatically so we can inspect the page
    console.log('Debugging complete. Browser left open for inspection.');
  }
}

// Get URL from command line arguments
const url = process.argv[2];

if (!url) {
  console.log('Usage: npm run debug-fiverr <fiverr-url>');
  process.exit(1);
}

debugFiverrPage(url);