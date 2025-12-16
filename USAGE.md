# Fiverr Gig Review Extractor - Usage Guide

## Overview

This application extracts reviews from Fiverr gig pages and exports them to CSV format. It provides both a web interface for users and an API for programmatic access.

## Features

- Extract reviews from any Fiverr gig URL
- Automatically load all reviews by handling pagination
- Export reviews to CSV format
- Prevent abuse with built-in rate limiting
- Handle errors gracefully
- Responsive web interface

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd gig_review_extractor
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open your browser to http://localhost:3000

### Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## Using the Web Interface

1. Open the application in your browser
2. Enter a valid Fiverr gig URL in the input field
3. Click "Extract Reviews"
4. Wait for the extraction to complete
5. View the extracted reviews in the table
6. Click "Export to CSV" to download the reviews

## Using the API

The application exposes a REST API endpoint for programmatic access:

### Endpoint

```
POST /api/extract-reviews
```

### Request Body

```json
{
  "url": "https://www.fiverr.com/username/gig-name"
}
```

### Response

#### Success (200 OK)

```json
{
  "reviews": [
    {
      "reviewer": "John Doe",
      "rating": 5,
      "text": "Excellent service!",
      "date": "2023-10-15"
    }
  ]
}
```

#### Error (400 Bad Request)

```json
{
  "error": "Please provide a valid Fiverr URL"
}
```

#### Rate Limit Exceeded (429 Too Many Requests)

```json
{
  "error": "Rate limit exceeded. Please try again in 1 minute.",
  "retryAfter": 60000
}
```

#### Server Error (500 Internal Server Error)

```json
{
  "error": "Failed to extract reviews. Please try again later."
}
```

### Example Usage with cURL

```bash
curl -X POST http://localhost:3000/api/extract-reviews \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.fiverr.com/username/gig-name"}'
```

### Example Usage with JavaScript

```javascript
async function extractReviews(url) {
  const response = await fetch('/api/extract-reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error);
  }

  return data.reviews;
}

// Usage
extractReviews('https://www.fiverr.com/username/gig-name')
  .then(reviews => console.log(reviews))
  .catch(error => console.error(error));
```

## Architecture

### Frontend

- Built with Next.js 13+ App Router
- Uses React Server Components
- Responsive design with Tailwind CSS
- Client-side state management with React hooks

### Backend

- Next.js API Routes
- Puppeteer for dynamic content scraping
- Cheerio as fallback for static content parsing
- In-memory rate limiting

### Data Flow

1. User submits a Fiverr URL via the web interface or API
2. The application validates the URL
3. Rate limiting is checked
4. The scraper attempts to extract reviews using Puppeteer
5. If Puppeteer fails, it falls back to Cheerio
6. Reviews are deduplicated
7. Results are returned to the user
8. User can export reviews to CSV

## Customization

### Adjusting Rate Limits

Modify the rate limiting parameters in [lib/rateLimiter.ts](lib/rateLimiter.ts):

```typescript
const rateLimiter = new RateLimiter(60000, 5); // 5 requests per minute
```

### Modifying Selectors

Update the CSS selectors in [lib/scraper.ts](lib/scraper.ts) to match Fiverr's current HTML structure:

```typescript
const reviewSelectors = [
  '[data-testid="review-card"]',
  '.review-item',
  '.review',
  '[class*="review"]'
];
```

### Adding New Fields

To extract additional review fields:

1. Update the [Review interface](lib/types.ts)
2. Modify the extraction logic in [lib/scraper.ts](lib/scraper.ts)
3. Update the CSV export function
4. Update the frontend display

## Troubleshooting

### Common Issues

1. **No reviews extracted**: Fiverr may have changed their HTML structure. Check the browser console for errors and update selectors accordingly.

2. **Timeout errors**: Increase timeout values in the scraper for slow-loading pages.

3. **Rate limiting**: The application implements rate limiting to prevent abuse. Wait for the specified time before making more requests.

4. **Puppeteer errors**: Ensure all dependencies are installed correctly. See [DEPLOYMENT.md](DEPLOYMENT.md) for troubleshooting Puppeteer issues.

### Debugging

Enable debug logging by setting the DEBUG environment variable:

```bash
DEBUG=scraper:* npm run dev
```

## Extending the Application

### Adding Authentication

To restrict access to the application:

1. Implement authentication middleware
2. Add user sessions
3. Protect API routes
4. Add user management

### Adding Database Storage

To persist extracted reviews:

1. Add a database (PostgreSQL, MongoDB, etc.)
2. Create a data model for reviews
3. Store reviews in the database
4. Add endpoints to retrieve stored reviews

### Adding Scheduled Extraction

To automatically extract reviews periodically:

1. Add a cron job or scheduled task
2. Implement batch processing
3. Send notifications of new reviews

### Adding Proxy Support

To avoid IP-based blocking:

1. Integrate with a proxy service
2. Rotate proxies for each request
3. Handle proxy failures gracefully

## Legal and Ethical Considerations

### Compliance

Ensure your use of this tool complies with:

- Fiverr's Terms of Service
- Copyright laws
- Data protection regulations (GDPR, CCPA, etc.)
- Robots exclusion standard (robots.txt)

### Responsible Use

- Respect rate limits to avoid overloading Fiverr's servers
- Only extract publicly available data
- Do not use the data for spam or other malicious purposes
- Attribute the source of the data when redistributing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests for new functionality
5. Update documentation
6. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.