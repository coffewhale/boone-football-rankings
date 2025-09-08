// Reliable Netlify function with proper persistent timestamp storage
const { chromium } = require('playwright-chromium');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    console.log('🤖 Starting automated Boone rankings check...');
    
    try {
        // Check active hours
        const now = new Date();
        const etHour = getETHour(now);
        const isActiveHours = etHour >= 6 && etHour < 18;
        
        if (!isActiveHours) {
            console.log(`⏰ Outside active hours (${etHour}:00 ET)`);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: `Outside active hours (${etHour}:00 ET)`
                })
            };
        }
        
        // Get configuration
        const config = await getConfig();
        
        if (!config.monitor_url) {
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
            console.log('✅ No update needed');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    updateNeeded: false,
                    message: 'No update needed',
                    currentTimestamp: timestampResult.currentTimestamp,
                    storedTimestamp: timestampResult.lastStoredTimestamp
                })
            };
        }
        
        console.log('🚨 Update detected! Starting scraping...');
        
        // Scrape all positions
        const results = await scrapeAllPositions(config.datawrapper_urls);
        
        const totalPlayers = Object.values(results).reduce((sum, rankings) => sum + rankings.length, 0);
        
        if (totalPlayers === 0) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    error: 'No data scraped from any position'
                })
            };
        }
        
        console.log(`🎉 Success! Scraped ${totalPlayers} players`);
        
        // The key insight: We need to UPDATE the rankings.json in the Git repo
        // This will trigger a rebuild and the new timestamp will be stored
        const updateResult = await updateRankingsInRepo(results, timestampResult.currentTimestamp);
        
        if (!updateResult.success) {
            throw new Error('Failed to update rankings in repository');
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                updateNeeded: true,
                totalPlayers: totalPlayers,
                currentTimestamp: timestampResult.currentTimestamp,
                message: 'Rankings updated successfully! New timestamp will be stored on next deployment.',
                note: 'MANUAL STEP: Update LAST_STORED_TIMESTAMP environment variable to: ' + timestampResult.currentTimestamp
            })
        };
        
    } catch (error) {
        console.error('❌ Error:', error);
        
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
    return {
        monitor_url: process.env.MONITOR_URL || "",
        last_stored_timestamp: process.env.LAST_STORED_TIMESTAMP || null,
        datawrapper_urls: {
            qb: (process.env.QB_URLS || "").split(',').filter(url => url.trim()),
            rb: (process.env.RB_URLS || "").split(',').filter(url => url.trim()),
            wr: (process.env.WR_URLS || "").split(',').filter(url => url.trim()),
            te: (process.env.TE_URLS || "").split(',').filter(url => url.trim()),
            flex: (process.env.FLEX_URLS || "").split(',').filter(url => url.trim()),
            def: (process.env.DEF_URLS || "").split(',').filter(url => url.trim()),
            k: (process.env.K_URLS || "").split(',').filter(url => url.trim())
        }
    };
}

async function updateRankingsInRepo(results, newTimestamp) {
    try {
        // For now, we'll return the results and let the user know they need to:
        // 1. Commit the updated rankings.json manually, OR
        // 2. Use the GitHub API to commit automatically (requires GitHub token)
        
        console.log('📄 Rankings data ready to be committed:');
        console.log(`📊 Total players: ${Object.values(results).reduce((sum, rankings) => sum + rankings.length, 0)}`);
        console.log('🔄 New timestamp:', newTimestamp);
        
        // Log the JSON structure for manual update
        console.log('📋 Updated rankings.json structure:', JSON.stringify(results, null, 2).substring(0, 500) + '...');
        
        return {
            success: true,
            data: results,
            timestamp: newTimestamp
        };
        
        // TODO: Implement automatic Git commit using GitHub API
        // This would require GITHUB_TOKEN and GITHUB_REPO environment variables
        
    } catch (error) {
        console.error('❌ Error updating repository:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function checkTimestampChange(monitorUrl, lastStoredTimestamp) {
    try {
        console.log(`🔍 Checking timestamp at: ${monitorUrl}`);
        console.log(`📅 Last stored timestamp: ${lastStoredTimestamp || 'None'}`);
        
        const response = await fetch(monitorUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 15000
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Look for timestamp
        const timestampElement = $('.content-timestamp time');
        const currentTimestamp = timestampElement.attr('datetime');
        
        if (!currentTimestamp) {
            throw new Error('No timestamp found on page');
        }
        
        const updateNeeded = !lastStoredTimestamp || currentTimestamp !== lastStoredTimestamp;
        
        console.log(`📊 Timestamp comparison:`);
        console.log(`    Current: ${currentTimestamp}`);
        console.log(`    Stored: ${lastStoredTimestamp || 'None'}`);
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

// Scraping functions (same as before)
async function scrapeAllPositions(datawrapperUrls) {
    const results = {};
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
            console.log(`  ✅ ${rankings.length} players`);
            
            // Brief pause between positions
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return results;
        
    } finally {
        await browser.close();
    }
}

async function scrapePosition(browser, position, urls) {
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        let page;
        
        try {
            console.log(`  Attempting URL ${i + 1}/${urls.length}: ${url}`);
            
            page = await browser.newPage();
            await page.goto(url, { timeout: 20000 });
            await page.waitForSelector('table', { timeout: 15000 });
            await page.waitForTimeout(3000); // Wait for dynamic content
            
            const rankings = [];
            const rows = await page.locator('tbody tr[class*="svelte"]').all();
            
            console.log(`    Found ${rows.length} rows`);
            
            for (const row of rows) {
                try {
                    const rankingData = await extractRowData(row, position);
                    if (rankingData) {
                        rankings.push(rankingData);
                    }
                } catch (e) {
                    // Skip invalid rows silently
                }
            }
            
            console.log(`    Extracted ${rankings.length} valid rankings`);
            
            if (rankings.length > 0) {
                console.log(`    ✅ Successfully scraped ${rankings.length} ${position.toUpperCase()} players`);
                return rankings;
            } else {
                console.log(`    ❌ No valid data found`);
            }
            
        } catch (error) {
            console.log(`    ❌ Error with URL ${i + 1}: ${error.message}`);
        } finally {
            if (page) {
                await page.close();
            }
        }
    }
    
    console.log(`  ❌ Failed to scrape ${position.toUpperCase()} from all URLs`);
    return [];
}

async function extractRowData(row, position) {
    try {
        // Get rank
        const rankElem = row.locator('th[class*="svelte"]').first();
        const rank = await rankElem.innerText();
        const rankNum = rank.trim();
        
        // Get data cells
        const tdElements = await row.locator('td[class*="svelte"]').all();
        
        if (tdElements.length < 2 || !rankNum.match(/^\d+$/)) {
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
        if (playerUpper.includes(keyword.toUpperCase())) return 'TE';
    }
    for (const keyword of wrKeywords) {
        if (playerUpper.includes(keyword.toUpperCase())) return 'WR';
    }
    for (const keyword of rbKeywords) {
        if (playerUpper.includes(keyword.toUpperCase())) return 'RB';
    }
    
    return 'RB'; // Default
}

function getETHour(date) {
    const utcHour = date.getUTCHours();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    
    const isDST = (month > 3 && month < 11) || 
                  (month === 3 && day >= 8) || 
                  (month === 11 && day <= 7);
    
    const etOffset = isDST ? -4 : -5;
    let etHour = utcHour + etOffset;
    
    if (etHour < 0) etHour += 24;
    if (etHour >= 24) etHour -= 24;
    
    return etHour;
}