# Deployment Guide

This guide explains how to deploy the Fiverr Gig Review Extractor for production use.

## Prerequisites

1. Node.js 18+ installed
2. npm or yarn package manager
3. A server or cloud platform for deployment (Vercel, Heroku, AWS, etc.)

## Local Development Setup

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

## Production Deployment

### Option 1: Vercel (Recommended)

1. Push your code to GitHub/GitLab/Bitbucket
2. Sign up for a Vercel account
3. Import your project
4. Configure environment variables if needed
5. Deploy!

### Option 2: Traditional Server Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

### Option 3: Docker Deployment

Create a Dockerfile:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t gig-review-extractor .
docker run -p 3000:3000 gig-review-extractor
```

## Environment Variables

For production, you may need to set these environment variables:

```env
# For Puppeteer (if using Chromium)
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# For rate limiting (if implemented)
REDIS_URL=your_redis_url
REDIS_TOKEN=your_redis_token
```

## Important Considerations

### Puppeteer Dependencies

If deploying to a Linux environment, you may need additional dependencies for Puppeteer:

```bash
# Ubuntu/Debian
apt-get update
apt-get install -y wget gnupg
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
apt-get update
apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
  --no-install-recommends
rm -rf /var/lib/apt/lists/*
```

### Memory Requirements

Puppeteer can be memory-intensive. Ensure your deployment environment has adequate RAM (at least 1GB recommended).

### Rate Limiting

Implement rate limiting to avoid being blocked by Fiverr:
- Limit requests to 1 per minute per IP
- Add random delays between requests
- Respect robots.txt

### Legal Compliance

Ensure your use complies with:
- Fiverr's Terms of Service
- Copyright laws
- Data protection regulations (GDPR, CCPA, etc.)

## Monitoring and Maintenance

1. Monitor server logs for errors
2. Set up uptime monitoring
3. Regularly update dependencies
4. Test scraping functionality periodically as website structures change

## Troubleshooting

### Common Issues

1. **Puppeteer not launching**: Ensure all dependencies are installed
2. **Timeout errors**: Increase timeout values in the scraper
3. **Empty results**: Fiverr may have changed their HTML structure
4. **CAPTCHA challenges**: May require human intervention or proxy rotation

### Debugging Tips

1. Test URLs manually in a browser first
2. Log intermediate scraping steps
3. Use Puppeteer's headful mode for debugging (in development)
4. Check Fiverr's robots.txt for restrictions