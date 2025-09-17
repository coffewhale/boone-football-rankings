const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    const { url } = event.queryStringParameters;

    if (!url) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'URL parameter is required' })
        };
    }

    try {
        console.log('Fetching article timestamp from:', url);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Look for Yahoo article timestamp patterns
        let timestamp = null;

        // Try different selectors for Yahoo Sports articles
        const selectors = [
            'time[datetime]',
            'meta[property="article:published_time"]',
            'meta[name="publish-date"]',
            '.caas-attr-time-style',
            '[data-reactid*="publish_time"]'
        ];

        for (const selector of selectors) {
            if (selector.includes('meta')) {
                const element = $(selector);
                if (element.length) {
                    timestamp = element.attr('content');
                    if (timestamp) break;
                }
            } else {
                const element = $(selector);
                if (element.length) {
                    timestamp = element.attr('datetime') || element.text();
                    if (timestamp) break;
                }
            }
        }

        // Try to find timestamp in the page content
        if (!timestamp) {
            const timePattern = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/;
            const match = html.match(timePattern);
            if (match) {
                timestamp = match[1];
            }
        }

        console.log('Found timestamp:', timestamp);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                timestamp: timestamp,
                success: !!timestamp
            })
        };

    } catch (error) {
        console.error('Error fetching article timestamp:', error);

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: error.message,
                success: false
            })
        };
    }
};