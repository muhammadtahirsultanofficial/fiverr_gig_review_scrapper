# Fiverr Gig Review Extractor - Usage Guide

## Overview

This tool extracts public reviews from Fiverr gig pages and exports them to CSV format. Due to Fiverr's anti-bot measures, some manual intervention may be required.

## How to Use

1. Start the application:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:3000`

3. Enter a valid Fiverr gig URL in the input field

4. Click "Extract Reviews"

## Handling CAPTCHA Challenges

Fiverr uses CAPTCHA challenges to prevent automated scraping. When encountered:

1. The browser window will remain open and visible
2. You'll see a message indicating CAPTCHA detection
3. Manually solve the CAPTCHA challenge
4. The tool will automatically continue after you solve it

## Troubleshooting

### No Reviews Found

If the tool reports "0 reviews found":

1. Check that the URL is a valid Fiverr gig page
2. Try refreshing the page and running the extraction again
3. Ensure you're not being blocked by Fiverr's anti-bot systems

### Rate Limiting

The tool implements rate limiting to prevent abuse:
- Maximum 5 requests per minute per IP address
- Exceeding this limit will result in a temporary block

### Common Issues

1. **Timeout Errors**: Fiverr may be slow to load. Try again later.
2. **Empty Results**: The gig may have no reviews or they may be loaded dynamically.
3. **Browser Not Opening**: Ensure you have permissions to launch browsers.

## Technical Details

### Extraction Methods

The tool uses two extraction methods:

1. **Puppeteer (Primary)**: Headless browser that mimics human interaction
2. **Cheerio (Fallback)**: Static HTML parser for simpler cases

### Data Collected

- Reviewer name
- Rating (1-5 stars)
- Review text
- Review date
- Country flag (if available)

## Best Practices

1. **Respect Rate Limits**: Don't make excessive requests
2. **Legal Compliance**: Only extract publicly available data
3. **Ethical Use**: Use the data in accordance with Fiverr's Terms of Service
4. **Data Accuracy**: Verify the extracted data for accuracy

## Support

For issues not covered in this guide, please check the console logs for detailed error messages.