import puppeteer from 'puppeteer';

// Sleep function
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function analyzeFiverrReviews(url: string) {
  console.log(`Analyzing Fiverr reviews for: ${url}`);
  
  const browser = await puppeteer.launch({
    headless: false,
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
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('Loading page...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('Waiting for initial content...');
    await sleep(5000);
    
    // Scroll to reviews section
    console.log('Scrolling to reviews section...');
    await page.evaluate(() => {
      // Try to find elements with "review" in their class or id
      const reviewElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const className = (el.className || '').toString();
        const id = (el.id || '').toString();
        return className.toLowerCase().includes('review') || id.toLowerCase().includes('review');
      });
      
      if (reviewElements.length > 0) {
        reviewElements[0].scrollIntoView({ behavior: 'smooth' });
      } else {
        // Fallback to scrolling to bottom
        window.scrollTo(0, document.body.scrollHeight);
      }
    });
    
    console.log('Waiting for reviews to load...');
    await sleep(5000);
    
    // Analyze the page structure
    console.log('\n=== PAGE ANALYSIS ===');
    
    // Get page title
    const title = await page.title();
    console.log('Title:', title);
    
    // Find all elements with "review" in class or id
    const reviewElements = await page.evaluate(() => {
      const elements: any[] = [];
      const allElements = Array.from(document.querySelectorAll('*'));
      
      allElements.forEach(el => {
        const className = (el.className || '').toString();
        const id = (el.id || '').toString();
        const text = (el.textContent || '').toString();
        
        if (className.toLowerCase().includes('review') || 
            id.toLowerCase().includes('review') ||
            text.toLowerCase().includes('review')) {
          elements.push({
            tagName: el.tagName,
            className: className.substring(0, 100),
            id: id.substring(0, 50),
            textLength: text.length,
            hasStars: text.includes('★') || text.includes('☆') || el.querySelectorAll('[class*="star"]').length > 0,
            sampleText: text.substring(0, 100)
          });
        }
      });
      
      return elements.slice(0, 50);
    });
    
    console.log('\nElements with "review" in class/id/text:');
    reviewElements.forEach((el, i) => {
      console.log(`${i+1}. ${el.tagName} class="${el.className}" id="${el.id}" (text: ${el.textLength} chars, stars: ${el.hasStars})`);
    });
    
    // Look for specific review containers
    console.log('\n=== LOOKING FOR REVIEW CONTAINERS ===');
    const reviewContainers = await page.evaluate(() => {
      const containers: any[] = [];
      const allDivs = Array.from(document.querySelectorAll('div'));
      
      allDivs.forEach(div => {
        // Look for divs that might contain reviews
        const text = (div.textContent || '').toString();
        const hasStars = text.includes('★') || text.includes('☆') || div.querySelectorAll('[class*="star"]').length > 0;
        const hasRating = div.querySelectorAll('[aria-label*="rating"], [aria-label*="star"]').length > 0;
        const hasAvatar = div.querySelectorAll('img[alt*="avatar"], [class*="avatar"]').length > 0;
        const hasDate = div.querySelectorAll('time, [class*="date"], [data-testid*="date"]').length > 0;
        
        if ((hasStars || hasRating) && text.length > 50 && hasAvatar && hasDate) {
          containers.push({
            tagName: div.tagName,
            className: div.className,
            id: div.id,
            textLength: text.length,
            hasStars,
            hasRating,
            hasAvatar,
            hasDate,
            sampleText: text.substring(0, 200)
          });
        }
      });
      
      return containers.slice(0, 20);
    });
    
    console.log('\nPotential review containers:');
    reviewContainers.forEach((container, i) => {
      console.log(`${i+1}. ${container.tagName}.${container.className || container.id} (${container.textLength} chars, stars: ${container.hasStars}, rating: ${container.hasRating}, avatar: ${container.hasAvatar}, date: ${container.hasDate})`);
      console.log(`    Sample: ${container.sampleText}`);
    });
    
    // Look for specific data-testid attributes
    console.log('\n=== LOOKING FOR DATA-TESTID ATTRIBUTES ===');
    const testDataElements = await page.evaluate(() => {
      const elements: any[] = [];
      const allElements = Array.from(document.querySelectorAll('*[data-testid]'));
      
      allElements.forEach(el => {
        const testId = el.getAttribute('data-testid');
        const text = (el.textContent || '').toString();
        
        elements.push({
          tagName: el.tagName,
          testId: testId,
          className: el.className,
          textLength: text.length,
          sampleText: text.substring(0, 100)
        });
      });
      
      return elements.slice(0, 30);
    });
    
    console.log('\nElements with data-testid:');
    testDataElements.forEach((el, i) => {
      console.log(`${i+1}. ${el.tagName}[data-testid="${el.testId}"] class="${el.className}" (${el.textLength} chars)`);
    });
    
    // Look specifically for Fiverr review elements
    console.log('\n=== FIVERR SPECIFIC ANALYSIS ===');
    const fiverrReviews = await page.evaluate(() => {
      // Try to find review cards specifically
      const reviewCards = Array.from(document.querySelectorAll('[data-testid="review-card"], .review-card, [class*="reviewCard"], .feedback-item'));
      
      const results: any[] = [];
      
      reviewCards.forEach((card, index) => {
        const cardData: any = {
          index: index,
          tagName: card.tagName,
          className: card.className,
          id: card.id,
          childrenCount: card.children.length
        };
        
        // Try to extract review data from this card
        try {
          // Reviewer name
          const nameElement = card.querySelector('[data-testid="review-buyer-name"], .reviewer-name, .username, h4');
          cardData.reviewer = nameElement ? (nameElement.textContent || '').trim() : 'Not found';
          
          // Rating
          const ratingElement = card.querySelector('[data-testid="review-rating"], .rating, [aria-label*="star"]');
          cardData.rating = ratingElement ? (ratingElement.getAttribute('aria-label') || ratingElement.textContent || '').trim() : 'Not found';
          
          // Review text
          const textElement = card.querySelector('[data-testid="review-content"], .review-content, .review-text, p');
          cardData.reviewText = textElement ? (textElement.textContent || '').trim().substring(0, 100) : 'Not found';
          
          // Date
          const dateElement = card.querySelector('time, [data-testid="review-date"], .review-date');
          cardData.date = dateElement ? (dateElement.textContent || dateElement.getAttribute('datetime') || '').trim() : 'Not found';
          
        } catch (error: unknown) {
          cardData.error = (error as Error).message;
        }
        
        results.push(cardData);
      });
      
      return results;
    });
    
    console.log('\nFiverr review cards found:');
    fiverrReviews.forEach((review, i) => {
      console.log(`${i+1}. ${review.tagName}.${review.className || review.id}`);
      console.log(`    Reviewer: ${review.reviewer}`);
      console.log(`    Rating: ${review.rating}`);
      console.log(`    Text: ${review.reviewText}`);
      console.log(`    Date: ${review.date}`);
      if (review.error) {
        console.log(`    Error: ${review.error}`);
      }
    });
    
    // Take screenshot
    await page.screenshot({ path: 'fiverr-analysis.png', fullPage: true });
    console.log('\nScreenshot saved as fiverr-analysis.png');
    
    console.log('\n=== MANUAL INSPECTION ===');
    console.log('Browser left open for manual inspection.');
    console.log('Please inspect the page and look for:');
    console.log('1. Review container elements');
    console.log('2. Reviewer name elements');
    console.log('3. Rating/star elements');
    console.log('4. Review text elements');
    console.log('5. Date elements');
    
  } catch (error) {
    console.error('Analysis error:', error);
    await browser.close();
  }
}

// Run with URL from command line
const url = process.argv[2];
if (!url) {
  console.log('Usage: npm run analyze-fiverr <fiverr-url>');
  process.exit(1);
}

analyzeFiverrReviews(url);