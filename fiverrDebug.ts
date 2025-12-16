import puppeteer from 'puppeteer';

// Sleep function
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function debugFiverrReviews(url: string) {
  console.log(`Debugging Fiverr reviews for: ${url}`);
  
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
      // Try to find the reviews section
      const allElements = Array.from(document.querySelectorAll('*'));
      const reviewSections = allElements.filter(el => {
        const text = el.textContent || '';
        const element = el as HTMLElement;
        return text.toLowerCase().includes('review') && 
               (element.offsetHeight > 500 || el.querySelectorAll('*').length > 10);
      });
      
      if (reviewSections.length > 0) {
        reviewSections[0].scrollIntoView({ behavior: 'smooth' });
      } else {
        // Fallback to scrolling to bottom
        window.scrollTo(0, document.body.scrollHeight);
      }
    });
    
    console.log('Waiting for reviews to load...');
    await sleep(5000);
    
    // Try to click "Show More" buttons
    console.log('Looking for "Show More" buttons...');
    let clickedButton = true;
    let attempts = 0;
    
    while (clickedButton && attempts < 10) {
      clickedButton = false;
      attempts++;
      
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text && (text.includes('Show') || text.includes('Load') || text.includes('More'))) {
          console.log(`Clicking button: "${text}"`);
          try {
            await button.click();
            clickedButton = true;
            await sleep(3000);
            break;
          } catch (error) {
            console.log('Failed to click button:', error);
          }
        }
      }
    }
    
    console.log('Final scroll to bottom...');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(3000);
    
    // Analyze the page structure
    console.log('\n=== PAGE ANALYSIS ===');
    
    // Get page title
    const title = await page.title();
    console.log('Title:', title);
    
    // Find elements with star ratings
    const starElements = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*')).filter(el => {
        return el.textContent?.includes('★') || 
               el.textContent?.includes('☆') ||
               el.className.includes('star') ||
               el.getAttribute('aria-label')?.includes('star');
      }).map(el => ({
        tagName: el.tagName,
        className: el.className,
        text: el.textContent?.substring(0, 100)
      })).slice(0, 20);
    });
    
    console.log('Star elements found:', starElements.length);
    console.log(starElements);
    
    // Find potential review containers
    const reviewContainers = await page.evaluate(() => {
      const containers: any[] = [];
      const allDivs = Array.from(document.querySelectorAll('div, article, section'));
      
      allDivs.forEach(div => {
        const text = div.textContent || '';
        const textContent = div.textContent || '';
        const starCount = textContent.split('★').length - 1 || 0;
        
        if ((starCount > 0 && text.length > 50) || 
            (text.includes('review') && text.length > 100)) {
          containers.push({
            tagName: div.tagName,
            className: div.className,
            id: div.id,
            textLength: text.length,
            starCount,
            sampleText: text.substring(0, 100)
          });
        }
      });
      
      return containers.slice(0, 60);
    });
    
    console.log('\nPotential review containers found:', reviewContainers.length);
    reviewContainers.forEach((container, i) => {
      console.log(`${i+1}. ${container.tagName}.${container.className || container.id} (${container.textLength} chars, ${container.starCount} stars)`);
    });
    
    // Take screenshot
    await page.screenshot({ path: 'fiverr-reviews-debug.png', fullPage: true });
    console.log('\nScreenshot saved as fiverr-reviews-debug.png');
    
    console.log('\n=== DEBUG COMPLETE ===');
    console.log('Browser left open for manual inspection');
    
  } catch (error) {
    console.error('Debug error:', error);
    await browser.close();
  }
}

// Run with URL from command line
const url = process.argv[2];
if (!url) {
  console.log('Usage: npm run debug-reviews <fiverr-url>');
  process.exit(1);
}

debugFiverrReviews(url);