// Minimal test to isolate the timestamp checking issue
const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    console.log('🧪 Minimal timestamp test...');
    
    try {
        const monitorUrl = process.env.MONITOR_URL;
        const lastTimestamp = process.env.LAST_STORED_TIMESTAMP;
        const githubToken = process.env.GITHUB_TOKEN;
        
        console.log('Environment check:');
        console.log(`- MONITOR_URL: ${monitorUrl ? 'Set' : 'Missing'}`);
        console.log(`- LAST_STORED_TIMESTAMP: ${lastTimestamp || 'None'}`);
        console.log(`- GITHUB_TOKEN: ${githubToken ? 'Set' : 'Missing'}`);
        
        if (!monitorUrl) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'MONITOR_URL not configured' })
            };
        }
        
        // Test Yahoo fetch
        console.log('Testing Yahoo fetch...');
        const response = await fetch(monitorUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });
        
        if (!response.ok) {
            throw new Error(`Yahoo fetch failed: ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Find timestamp
        let currentTimestamp = null;
        const selectors = ['.content-timestamp time', 'time[datetime]'];
        
        for (const selector of selectors) {
            const element = $(selector);
            if (element.length > 0) {
                currentTimestamp = element.attr('datetime');
                if (currentTimestamp) break;
            }
        }
        
        const updateNeeded = !lastTimestamp || currentTimestamp !== lastTimestamp;
        
        console.log(`Current timestamp: ${currentTimestamp}`);
        console.log(`Stored timestamp: ${lastTimestamp}`);
        console.log(`Update needed: ${updateNeeded}`);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                timestamp: {
                    current: currentTimestamp,
                    stored: lastTimestamp,
                    updateNeeded: updateNeeded
                },
                environment: {
                    monitorUrl: !!monitorUrl,
                    githubToken: !!githubToken
                },
                message: updateNeeded ? 'Update would be triggered' : 'No update needed'
            }, null, 2)
        };
        
    } catch (error) {
        console.error('Error:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message,
                stack: error.stack
            }, null, 2)
        };
    }
};