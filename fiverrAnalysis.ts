import puppeteer from 'puppeteer';

async function analyzeFiverrStructure() {
  const url = 'https://www.fiverr.com/amz_guruu/setup-optimize-and-manage-amazon-ppc-campaigns-amzaon-ppc-amazon-va-amazon-fba';
  
  console.log(`Analyzing Fiverr structure for URL: ${url}`);
  
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
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    console.log('Waiting for initial content...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Scroll to reviews section
    console.log('Scrolling to reviews section...');
    await page.evaluate(() => {
      // Try to find the reviews section
      const reviewSections = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        return text.toLowerCase().includes('review') && 
               (text.toLowerCase().includes('see all') || text.toLowerCase().includes('show all'));
      });
      
      if (reviewSections.length > 0) {
        reviewSections[0].scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo(0, document.body.scrollHeight * 0.75); // Scroll to 75% of page
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Click "See all reviews" if available
    console.log('Looking for "See all reviews" button...');
    try {
      const seeAllButton = await page.$('button:enabled');
      if (seeAllButton) {
        const buttonText = await page.evaluate(el => el.textContent, seeAllButton);
        if (buttonText && buttonText.toLowerCase().includes('see all')) {
          console.log(`Clicking "See all reviews" button: ${buttonText}`);
          await seeAllButton.click();
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    } catch (error) {
      console.log('No "See all reviews" button found or error clicking it');
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'fiverr_page.png', fullPage: true });
    console.log('Screenshot saved as fiverr_page.png');
    
    // Analyze the page structure
    console.log('\n=== PAGE STRUCTURE ANALYSIS ===');
    
    // Get all unique class names
    const classNames = await page.evaluate(() => {
      const classes = new Set<string>();
      const allElements = Array.from(document.querySelectorAll('*'));
      
      allElements.forEach(el => {
        const className = el.className || '';
        if (typeof className === 'string' && className.trim()) {
          className.split(' ').forEach(cls => {
            if (cls.trim()) {
              classes.add(cls.trim());
            }
          });
        }
      });
      
      return Array.from(classes).filter(cls => 
        cls.toLowerCase().includes('review') || 
        cls.toLowerCase().includes('feedback') ||
        cls.toLowerCase().includes('testimonial')
      );
    });
    
    console.log('Class names containing "review", "feedback", or "testimonial":');
    classNames.forEach((cls, i) => {
      console.log(`${i+1}. ${cls}`);
    });
    
    // Look for data-testid attributes
    const testDataIds = await page.evaluate(() => {
      const ids = new Set<string>();
      const allElements = Array.from(document.querySelectorAll('*[data-testid]'));
      
      allElements.forEach(el => {
        const testId = el.getAttribute('data-testid');
        if (testId) {
          ids.add(testId);
        }
      });
      
      return Array.from(ids).filter(id => 
        id.toLowerCase().includes('review') || 
        id.toLowerCase().includes('feedback')
      );
    });
    
    console.log('\nData-testid attributes containing "review" or "feedback":');
    testDataIds.forEach((id, i) => {
      console.log(`${i+1}. ${id}`);
    });
    
    // Look for elements with star icons
    const starElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const starElements: any[] = [];
      
      elements.forEach(el => {
        const html = el.outerHTML || '';
        const text = el.textContent || '';
        
        if (html.includes('★') || html.includes('☆') || 
            html.includes('star') || text.includes('out of 5')) {
          starElements.push({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            textPreview: text.substring(0, 50)
          });
        }
      });
      
      return starElements.slice(0, 20);
    });
    
    console.log('\nElements with star-related content:');
    starElements.forEach((el, i) => {
      console.log(`${i+1}. ${el.tagName}.${el.className}#${el.id} - ${el.textPreview}`);
    });
    
    console.log('\nManual inspection recommended:');
    console.log('1. Open DevTools (F12)');
    console.log('2. Inspect review elements');
    console.log('3. Look for common patterns in class names');
    console.log('4. Check data-testid attributes');
    console.log('5. Examine the structure of review containers');
    
  } catch (error) {
    console.error('Analysis error:', error);
  } finally {
    console.log('Browser kept open for manual inspection');
  }
}

analyzeFiverrStructure();