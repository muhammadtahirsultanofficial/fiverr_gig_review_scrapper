# Fiverr Gig Review Extractor

A Next.js application that extracts public reviews from Fiverr gig pages and exports them to CSV format.

## Features

- Extracts reviewer names, ratings, review text, dates, and countries
- Handles dynamic content loading (lazy-loaded reviews)
- Automatically clicks "Load More" buttons
- Removes duplicate reviews
- Exports data to CSV format
- Responsive web interface
- Rate limiting to prevent abuse
- Error handling and user feedback

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Chrome/Chromium browser (for Puppeteer)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Puppeteer browsers (if not already installed):
   ```bash
   npx puppeteer browsers install chrome
   ```

## Usage

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:3000`

3. Enter a Fiverr gig URL and click "Extract Reviews"

4. Export the results to CSV using the "Export to CSV" button

## How It Works

### Frontend (Next.js)

- Built with Next.js 13+ App Router
- Responsive UI with Tailwind CSS
- Client-side state management with React hooks
- API integration with fetch

### Backend (API Routes)

- Next.js API routes for server-side processing
- Rate limiting middleware
- Error handling and validation

### Scraping Engine

- **Puppeteer**: Headless Chrome browser for dynamic content
- **Cheerio**: Static HTML parser as fallback
- Intelligent selectors for Fiverr review elements
- Duplicate detection and removal
- CAPTCHA detection and handling

## Project Structure

```
app/
  ├── api/
  │   └── extract-reviews/
  │       └── route.ts      # API endpoint for review extraction
  ├── page.tsx             # Main application page
lib/
  ├── scraper.ts           # Core scraping logic
  ├── rateLimiter.ts       # Rate limiting implementation
  └── types.ts             # TypeScript interfaces
public/
  └── ...                  # Static assets
tests/
  └── scraper.test.ts      # Unit tests
```

## Configuration

### Rate Limiting

The application implements rate limiting to prevent abuse:
- 5 requests per minute per IP address
- Configurable in `lib/rateLimiter.ts`

### Environment Variables

Create a `.env.local` file for environment-specific configuration:
```env
# Optional: Custom rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=5
```

## Testing

Run unit tests:
```bash
npm test
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub/GitLab
2. Import project to Vercel
3. Configure environment variables if needed

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Known Limitations

1. **CAPTCHA Challenges**: Fiverr may present CAPTCHA challenges that require manual solving
2. **Dynamic Content**: Some content may load differently based on user interaction
3. **Rate Limits**: Fiverr may impose additional rate limits on automated requests
4. **DOM Changes**: Fiverr's page structure may change, requiring selector updates

## Troubleshooting

### Common Issues

1. **"No reviews found"**: 
   - Check the URL is valid
   - Try again later (Fiverr may be temporarily blocking requests)
   - Manually solve any CAPTCHA challenges

2. **Timeout Errors**:
   - Increase timeout values in `lib/scraper.ts`
   - Check internet connection

3. **Browser Not Launching**:
   - Ensure Puppeteer is properly installed
   - Check system permissions

### Debugging

Enable debug logging by setting environment variables:
```env
DEBUG=puppeteer:*  # Puppeteer debug logs
DEBUG=scraper:*    # Scraper debug logs
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This tool is for educational purposes only. Users are responsible for ensuring their use complies with Fiverr's Terms of Service and applicable laws. The developers are not responsible for any misuse of this tool.