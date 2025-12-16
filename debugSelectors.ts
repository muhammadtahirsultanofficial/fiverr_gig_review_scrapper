import puppeteer from 'puppeteer';

async function debugSelectors() {
  const url = 'https://www.fiverr.com/amz_guruu/setup-optimize-and-manage-amazon-ppc-campaigns-amzaon-ppc-amazon-va-amazon-fba';
  
  console.log(`Debugging selectors for URL: ${url}`);
  
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled'
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
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Scroll to load content
    console.log('Scrolling to load reviews...');
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Debug: Find all elements with "review" in class or text
    console.log('\n=== DEBUGGING SELECTORS ===');
    
    const reviewElements = await page.evaluate(() => {
      const elements: any[] = [];
      const allElements = Array.from(document.querySelectorAll('*'));
      
      allElements.forEach(el => {
        const className = el.className || '';
        const text = el.textContent || '';
        
        // Look for review-related elements
        if (className.toLowerCase().includes('review') || 
            text.toLowerCase().includes('review') ||
            className.toLowerCase().includes('feedback') ||
            text.toLowerCase().includes('feedback') ||
            el.querySelectorAll('svg').length > 0) {
          
          elements.push({
            tagName: el.tagName,
            className: className.substring(0, 100),
            textPreview: text.substring(0, 100),
            hasStars: el.querySelectorAll('svg, [class*="star"]').length > 0,
            hasAvatar: el.querySelectorAll('img[alt*="avatar"], [class*="avatar"]').length > 0,
            hasDate: el.querySelectorAll('time, [class*="date"]').length > 0
          });
        }
      });
      
      return elements.slice(0, 30);
    });
    
    console.log(`Found ${reviewElements.length} potential review elements:`);
    reviewElements.forEach((el, i) => {
      console.log(`${i+1}. ${el.tagName}.${el.className} (stars: ${el.hasStars}, avatar: ${el.hasAvatar}, date: ${el.hasDate})`);
      console.log(`   Text: ${el.textPreview}`);
    });
    
    // Debug: Look for specific Fiverr patterns
    console.log('\n=== FIVERR-SPECIFIC PATTERNS ===');
    
    const fiverrPatterns = await page.evaluate(() => {
      const results: any[] = [];
      
      // Look for common Fiverr review structures
      const containers = Array.from(document.querySelectorAll('div'));
      
      containers.forEach((container, index) => {
        const text = container.textContent || '';
        const stars = container.querySelectorAll('svg, [class*="star"]').length;
        const avatars = container.querySelectorAll('img[alt*="avatar"], [class*="avatar"]').length;
        const dates = container.querySelectorAll('time, [class*="date"]').length;
        
        // Score based on likelihood of being a review
        let score = 0;
        if (stars > 0) score += 3;
        if (avatars > 0) score += 2;
        if (dates > 0) score += 2;
        if (text.length > 50) score += 1;
        if (text.includes('out of 5')) score += 2;
        if (text.includes('★')) score += 2;
        
        if (score >= 5) {
          results.push({
            index,
            score,
            stars,
            avatars,
            dates,
            textLength: text.length,
            className: container.className,
            sampleText: text.substring(0, 200)
          });
        }
      });
      
      // Sort by score
      return results.sort((a, b) => b.score - a.score).slice(0, 10);
    });
    
    console.log('Top candidates for review containers:');
    fiverrPatterns.forEach((pattern, i) => {
      console.log(`${i+1}. Score: ${pattern.score} (Stars: ${pattern.stars}, Avatars: ${pattern.avatars}, Dates: ${pattern.dates})`);
      console.log(`   Class: ${pattern.className}`);
      console.log(`   Text: ${pattern.sampleText}`);
    });
    
    console.log('\nBrowser left open for manual inspection.');
    console.log('Check the console in the browser DevTools for more details.');
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    // Don't close browser so we can inspect manually
    console.log('Keeping browser open for inspection...');
  }
}

debugSelectors();