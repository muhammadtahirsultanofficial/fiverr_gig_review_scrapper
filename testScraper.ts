import { extractFiverrReviewsWithFallback } from './lib/scraper';

async function testScraper() {
  const url = 'https://www.fiverr.com/amz_guruu/setup-optimize-and-manage-amazon-ppc-campaigns-amzaon-ppc-amazon-va-amazon-fba';
  
  console.log(`Testing scraper with URL: ${url}`);
  
  try {
    const reviews = await extractFiverrReviewsWithFallback(url);
    console.log(`Extracted ${reviews.length} reviews:`);
    
    // Show first few reviews as examples
    reviews.slice(0, 3).forEach((review, index) => {
      console.log(`\n--- Review ${index + 1} ---`);
      console.log(`Reviewer: ${review.reviewer}`);
      console.log(`Rating: ${review.rating}/5`);
      console.log(`Date: ${review.date}`);
      console.log(`Text: ${review.text.substring(0, 100)}...`);
    });
    
    if (reviews.length === 0) {
      console.log('No reviews found. This could be due to:');
      console.log('1. CAPTCHA challenge (requires manual solving)');
      console.log('2. Dynamic content not loading properly');
      console.log('3. Changed Fiverr DOM structure');
    }
  } catch (error) {
    console.error('Error testing scraper:', error);
  }
}

testScraper();