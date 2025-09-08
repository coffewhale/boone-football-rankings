// Netlify function for automated Boone rankings scraping
const { chromium } = require('playwright-chromium');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Configuration - you can also use environment variables
const DEFAULT_CONFIG = {
    monitor_url: process.env.MONITOR_URL || "",
    datawrapper_urls: {
        qb: (process.env.QB_URLS || "").split(',').filter(url => url.trim()),
        rb: (process.env.RB_URLS || "").split(',').filter(url => url.trim()),
        wr: (process.env.WR_URLS || "").split(',').filter(url => url.trim()),
        te: (process.env.TE_URLS || "").split(',').filter(url => url.trim()),
        flex: (process.env.FLEX_URLS || "").split(',').filter(url => url.trim()),
        def: (process.env.DEF_URLS || "").split(',').filter(url => url.trim()),
        k: (process.env.K_URLS || "").split(',').filter(url => url.trim())
    },
    last_stored_timestamp: process.env.LAST_STORED_TIMESTAMP || null
};

exports.handler = async (event, context) => {
    console.log('🤖 Starting automated Boone rankings check...');
    
    try {
        // Check if we're in active hours (6 AM ET to 6 PM ET)
        const now = new Date();
        const etHour = getETHour(now);
        const isActiveHours = etHour >= 6 && etHour < 18;
        
        if (!isActiveHours) {
            console.log(`⏰ Outside active hours (${etHour}:00 ET). Boone only updates between 6 AM and 6 PM ET.`);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: `Outside active hours (${etHour}:00 ET). Next check will be during 6 AM - 6 PM ET.`
                })
            };
        }
        
        console.log(`✅ Active hours (${etHour}:00 ET) - proceeding with check`);
        
        // Get configuration (prefer environment variables, fallback to hardcoded)
        const config = await getConfig();
        
        if (!config.monitor_url) {
            console.log('❌ No monitor URL configured');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'No monitor URL configured'
                })
            };
        }
        
        // Check for timestamp changes
        const timestampResult = await checkTimestampChange(config.monitor_url, config.last_stored_timestamp);
        
        if (!timestampResult.updateNeeded) {
            console.log('✅ No update needed - timestamps match');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    updateNeeded: false,
                    message: 'No update needed',
                    currentTimestamp: timestampResult.currentTimestamp
                })
            };
        }
        
        console.log('🚨 Update detected! Starting automated scraping...');
        
        // Scrape all configured positions
        const scrapingResults = await scrapeAllPositions(config.datawrapper_urls);
        
        // Check if we got any data
        const totalPlayers = Object.values(scrapingResults).reduce((sum, rankings) => sum + rankings.length, 0);
        
        if (totalPlayers === 0) {
            console.log('❌ No data was scraped from any position');
            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    error: 'No data scraped from any position'
                })
            };
        }
        
        console.log(`✅ Scraped ${totalPlayers} total players`);
        
        // Log the results (in a real deployment, you'd save to a database or file storage)
        console.log('📊 Scraping Summary:');
        Object.entries(scrapingResults).forEach(([position, rankings]) => {
            console.log(`  ${position.upper()}: ${rankings.length} players`);
        });
        
        // In a real implementation, you'd:
        // 1. Save scrapingResults to your database/file storage
        // 2. Update the LAST_STORED_TIMESTAMP environment variable
        // 3. Trigger your site rebuild
        
        console.log('🎉 Automated scraping completed successfully!');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                updateNeeded: true,
                totalPlayers: totalPlayers,
                results: scrapingResults,
                currentTimestamp: timestampResult.currentTimestamp,
                message: 'Automated scraping completed successfully'
            })
        };
        
    } catch (error) {
        console.error('❌ Error in automated scraper:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

async function getConfig() {
    // In a real implementation, you might load this from a database or file storage
    // For now, we'll use environment variables with fallbacks
    
    const config = {
        monitor_url: process.env.MONITOR_URL || DEFAULT_CONFIG.monitor_url,
        last_stored_timestamp: process.env.LAST_STORED_TIMESTAMP || DEFAULT_CONFIG.last_stored_timestamp,
        datawrapper_urls: {}
    };
    
    // Load Datawrapper URLs from environment variables
    const positions = ['qb', 'rb', 'wr', 'te', 'flex', 'def', 'k'];
    positions.forEach(position => {
        const envKey = `${position.toUpperCase()}_URLS`;
        const envValue = process.env[envKey] || "";
        config.datawrapper_urls[position] = envValue.split(',').map(url => url.trim()).filter(url => url);
    });
    
    console.log('📋 Loaded configuration:');
    console.log(`  Monitor URL: ${config.monitor_url ? '✅' : '❌'}`);
    console.log(`  Last timestamp: ${config.last_stored_timestamp || 'None'}`);
    
    positions.forEach(position => {
        const count = config.datawrapper_urls[position].length;
        console.log(`  ${position.toUpperCase()}: ${count} URL(s)`);
    });
    
    return config;
}

async function checkTimestampChange(monitorUrl, lastStoredTimestamp) {
    try {
        console.log(`🔍 Checking timestamp at: ${monitorUrl}`);
        
        const response = await fetch(monitorUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Extract timestamp from content-timestamp div
        const timestampElement = $('.content-timestamp time');
        const currentTimestamp = timestampElement.attr('datetime');
        
        if (!currentTimestamp) {
            throw new Error('No timestamp found on page - page structure may have changed');
        }
        
        const updateNeeded = !lastStoredTimestamp || currentTimestamp !== lastStoredTimestamp;
        
        console.log(`📊 Timestamp comparison:`);
        console.log(`    Current: ${currentTimestamp}`);
        console.log(`    Last stored: ${lastStoredTimestamp || 'None'}`);
        console.log(`    Update needed: ${updateNeeded ? 'YES' : 'NO'}`);
        
        return {
            updateNeeded,
            currentTimestamp,
            lastStoredTimestamp
        };
        
    } catch (error) {
        console.error('Error checking timestamp:', error);
        throw error;
    }
}

async function scrapeAllPositions(datawrapperUrls) {
    const results = {};
    
    // Launch browser
    const browser = await chromium.launch();
    
    try {
        for (const [position, urls] of Object.entries(datawrapperUrls)) {
            if (!urls || urls.length === 0) {
                results[position] = [];
                continue;
            }
            
            console.log(`🔍 Scraping ${position.toUpperCase()} from ${urls.length} URL(s)`);
            
            const rankings = await scrapePosition(browser, position, urls);
            results[position] = rankings;
            
            console.log(`  ${position.toUpperCase()}: ${rankings.length} players`);
            
            // Brief pause between positions
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        return results;
        
    } finally {
        await browser.close();
    }
}

async function scrapePosition(browser, position, urls) {
    for (const url of urls) {
        try {
            console.log(`  Attempting ${position.toUpperCase()}: ${url}`);
            
            const page = await browser.newPage();
            
            try {
                await page.goto(url, { timeout: 30000 });
                await page.waitForSelector('table', { timeout: 15000 });
                await page.waitForTimeout(3000); // Wait for dynamic content
                
                const rankings = [];
                
                const rows = await page.locator('tbody tr[class*="svelte"]').all();
                
                for (const row of rows) {
                    try {
                        const rankingData = await extractRowData(row, position);
                        if (rankingData) {
                            rankings.push(rankingData);
                        }
                    } catch (e) {
                        console.log(`    Warning: Error processing row: ${e.message}`);
                    }
                }
                
                await page.close();
                
                if (rankings.length > 0) {
                    console.log(`    ✅ Successfully scraped ${rankings.length} players`);
                    return rankings;
                } else {
                    console.log(`    ❌ No data found`);
                }
                
            } catch (e) {
                await page.close();
                throw e;
            }
            
        } catch (error) {
            console.log(`    ❌ Error with URL: ${error.message}`);
        }
    }
    
    console.log(`  ❌ Failed to scrape ${position.toUpperCase()} from all URLs`);
    return [];
}

async function extractRowData(row, position) {
    try {
        // Get rank from th element
        const rankElem = row.locator('th[class*="svelte"]').first();
        const rank = await rankElem.innerText();
        const rankNum = rank.trim();
        
        // Get all td elements
        const tdElements = await row.locator('td[class*="svelte"]').all();
        
        if (tdElements.length < 2 || !rankNum || !rankNum.match(/^\d+$/)) {
            return null;
        }
        
        const player = await tdElements[0].innerText();
        const opponent = await tdElements[tdElements.length - 1].innerText();
        
        const rankingData = {
            preGameRank: parseInt(rankNum),
            player: player.trim(),
            opponent: opponent.trim()
        };
        
        // Add position rank for FLEX
        if (position === 'flex') {
            const guessedPosition = guessPosition(player.trim());
            rankingData.positionRank = `${guessedPosition}${rankNum}`;
        }
        
        return rankingData;
        
    } catch (error) {
        return null;
    }
}

function guessPosition(playerName) {
    const rbKeywords = ['McCaffrey', 'Henry', 'Cook', 'Kamara', 'Barkley', 'Robinson', 'Gibbs'];
    const wrKeywords = ['Chase', 'Jefferson', 'Hill', 'Adams', 'Evans', 'Brown', 'Lamb'];
    const teKeywords = ['Kelce', 'Andrews', 'Kittle', 'Waller', 'Hockenson', 'LaPorta'];
    
    const playerUpper = playerName.toUpperCase();
    
    for (const keyword of teKeywords) {
        if (playerUpper.includes(keyword.toUpperCase())) {
            return 'TE';
        }
    }
    
    for (const keyword of wrKeywords) {
        if (playerUpper.includes(keyword.toUpperCase())) {
            return 'WR';
        }
    }
    
    for (const keyword of rbKeywords) {
        if (playerUpper.includes(keyword.toUpperCase())) {
            return 'RB';
        }
    }
    
    return 'RB'; // Default
}

function getETHour(date) {
    // Convert current time to Eastern Time
    const utcHour = date.getUTCHours();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    
    // Simple DST calculation for Eastern Time
    const isDST = (month > 3 && month < 11) || 
                  (month === 3 && day >= 8) || 
                  (month === 11 && day <= 7);
    
    const etOffset = isDST ? -4 : -5; // EDT (-4) or EST (-5)
    let etHour = utcHour + etOffset;
    
    // Handle day rollover
    if (etHour < 0) etHour += 24;
    if (etHour >= 24) etHour -= 24;
    
    return etHour;
}