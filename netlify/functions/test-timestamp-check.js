// Minimal test of just the timestamp checking functionality
const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    console.log('🧪 Testing timestamp check functionality...');
    
    try {
        // Check environment variables
        const monitorUrl = process.env.MONITOR_URL;
        const lastTimestamp = process.env.LAST_STORED_TIMESTAMP;
        const githubToken = process.env.GITHUB_TOKEN;
        
        console.log('🔍 Environment check:');
        console.log(`  MONITOR_URL: ${monitorUrl ? 'exists' : 'missing'}`);
        console.log(`  LAST_STORED_TIMESTAMP: ${lastTimestamp ? 'exists' : 'missing'}`);
        console.log(`  GITHUB_TOKEN: ${githubToken ? 'exists' : 'missing'}`);
        
        if (!monitorUrl) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: 'MONITOR_URL environment variable is required',
                    availableEnvKeys: Object.keys(process.env).filter(k => k.includes('MONITOR') || k.includes('GITHUB') || k.includes('LAST_'))
                })
            };
        }
        
        // Test timestamp checking
        console.log(`🔍 Checking timestamp at: ${monitorUrl}`);
        
        const response = await fetch(monitorUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Boone-Rankings-Bot)' },
            timeout: 15000
        });
        
        if (!response.ok) {
            throw new Error(`Yahoo fetch failed: HTTP ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        let currentTimestamp = null;
        const selectors = ['.content-timestamp time', 'time[datetime]', '[data-timestamp]'];
        
        for (const selector of selectors) {
            const element = $(selector);
            if (element.length > 0) {
                currentTimestamp = element.attr('datetime') || element.attr('data-timestamp');
                if (currentTimestamp) break;
            }
        }
        
        const updateNeeded = !lastTimestamp || currentTimestamp !== lastTimestamp;
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Timestamp check successful',
                environment: {
                    monitorUrl: monitorUrl,
                    hasLastTimestamp: !!lastTimestamp,
                    hasGithubToken: !!githubToken
                },
                timestamps: {
                    current: currentTimestamp,
                    stored: lastTimestamp,
                    updateNeeded: updateNeeded
                }
            }, null, 2)
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message,
                availableEnvKeys: Object.keys(process.env).filter(k => k.includes('MONITOR') || k.includes('GITHUB') || k.includes('LAST_'))
            }, null, 2)
        };
    }
};