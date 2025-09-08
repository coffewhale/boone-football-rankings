// Test function to verify basic scraping functionality
const { chromium } = require('playwright-chromium');

exports.handler = async (event, context) => {
    console.log('🧪 Starting scraping test...');
    
    try {
        // Get QB URL from environment (fallback to known working URL)
        const testUrl = process.env.QB_URLS ? 
            process.env.QB_URLS.split(',')[0].trim() : 
            'https://datawrapper.dwcdn.net/bqgx9/';
        
        console.log(`Testing URL: ${testUrl}`);
        
        // Test browser automation
        const browser = await chromium.launch();
        const page = await browser.newPage();
        
        try {
            console.log('Loading page...');
            const response = await page.goto(testUrl, { timeout: 20000 });
            console.log(`Page loaded with status: ${response.status}`);
            
            console.log('Waiting for table...');
            await page.waitForSelector('table', { timeout: 15000 });
            
            console.log('Getting table data...');
            const rows = await page.locator('tbody tr[class*="svelte"]').all();
            console.log(`Found ${rows.length} rows`);
            
            // Get first few players as test
            const testPlayers = [];
            for (let i = 0; i < Math.min(5, rows.length); i++) {
                try {
                    const row = rows[i];
                    const rankElem = row.locator('th[class*="svelte"]').first();
                    const rank = await rankElem.innerText();
                    
                    const tdElements = await row.locator('td[class*="svelte"]').all();
                    if (tdElements.length >= 2) {
                        const player = await tdElements[0].innerText();
                        const opponent = await tdElements[tdElements.length - 1].innerText();
                        
                        testPlayers.push({
                            rank: rank.trim(),
                            player: player.trim(),
                            opponent: opponent.trim()
                        });
                    }
                } catch (e) {
                    console.log(`Error processing row ${i}: ${e.message}`);
                }
            }
            
            await browser.close();
            
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: "✅ SUCCESS",
                    test_url: testUrl,
                    results: {
                        page_loaded: true,
                        table_found: true,
                        total_rows: rows.length,
                        sample_players: testPlayers
                    },
                    message: `Successfully scraped ${testPlayers.length} test players from ${rows.length} total rows`,
                    sample_data: testPlayers
                }, null, 2)
            };
            
        } finally {
            await browser.close();
        }
        
    } catch (error) {
        console.error('Test error:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: "❌ FAILED",
                error: error.message,
                stack: error.stack
            }, null, 2)
        };
    }
};