// Enhanced Netlify function with proper timestamp storage
const { chromium } = require('playwright-chromium');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
    console.log('🤖 Starting automated Boone rankings check...');
    
    try {
        // Check if we're in active hours (6 AM ET to 6 PM ET)
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
                    message: 'No update needed'
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
                    error: 'No data scraped'
                })
            };
        }
        
        // Save results to a JSON file in the repo (this will trigger a rebuild)
        await saveRankingsToFile(results);
        
        // Update the stored timestamp using multiple methods for reliability
        await updateStoredTimestamp(timestampResult.currentTimestamp);
        
        console.log(`🎉 Success! Scraped ${totalPlayers} players and updated rankings`);
        
        // Trigger site rebuild (optional)
        await triggerSiteRebuild();
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                updateNeeded: true,
                totalPlayers: totalPlayers,
                currentTimestamp: timestampResult.currentTimestamp,
                message: 'Rankings updated successfully!'
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
    // Load configuration from environment variables
    const config = {
        monitor_url: process.env.MONITOR_URL || "",
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
    
    // Get last stored timestamp from multiple sources
    config.last_stored_timestamp = await getLastStoredTimestamp();
    
    return config;
}

async function getLastStoredTimestamp() {
    // Method 1: Environment variable (primary)
    if (process.env.LAST_STORED_TIMESTAMP) {
        console.log('📅 Using timestamp from environment variable');
        return process.env.LAST_STORED_TIMESTAMP;
    }
    
    // Method 2: Read from a file in the repo
    try {
        const timestampPath = path.join(process.cwd(), 'last_timestamp.txt');
        const timestamp = await fs.readFile(timestampPath, 'utf8');
        console.log('📅 Using timestamp from file');
        return timestamp.trim();
    } catch (error) {
        console.log('📅 No stored timestamp found');
        return null;
    }
}

async function updateStoredTimestamp(newTimestamp) {
    console.log(`💾 Updating stored timestamp to: ${newTimestamp}`);
    
    // Method 1: Save to a file in the repo (this will be committed and deployed)
    try {
        const timestampPath = path.join(process.cwd(), 'last_timestamp.txt');
        await fs.writeFile(timestampPath, newTimestamp);
        console.log('✅ Timestamp saved to file');
    } catch (error) {
        console.warn('⚠️ Could not save timestamp to file:', error.message);
    }
    
    // Method 2: You would manually update the environment variable
    console.log('⚠️ MANUAL STEP: Update LAST_STORED_TIMESTAMP environment variable to:', newTimestamp);
    
    // Method 3: For future enhancement - you could use Netlify API to update env vars
    // This would require NETLIFY_AUTH_TOKEN and SITE_ID environment variables
}

async function saveRankingsToFile(results) {
    try {
        // Create backup first
        const backupPath = path.join(process.cwd(), `rankings.json.backup.${Date.now()}`);
        try {
            const existingData = await fs.readFile(path.join(process.cwd(), 'rankings.json'), 'utf8');
            await fs.writeFile(backupPath, existingData);
            console.log('📄 Backup created');
        } catch (e) {
            console.log('📄 No existing file to backup');
        }
        
        // Save new rankings
        const rankingsPath = path.join(process.cwd(), 'rankings.json');
        await fs.writeFile(rankingsPath, JSON.stringify(results, null, 2));
        console.log('✅ Rankings saved to file');
        
    } catch (error) {
        console.error('❌ Error saving rankings:', error);
        throw error;
    }
}

async function triggerSiteRebuild() {
    // If you have a build hook URL, you can trigger a rebuild
    if (process.env.BUILD_HOOK_URL) {
        try {
            await fetch(process.env.BUILD_HOOK_URL, { method: 'POST' });
            console.log('🚀 Site rebuild triggered');
        } catch (error) {
            console.warn('⚠️ Could not trigger rebuild:', error.message);
        }
    }
}

async function checkTimestampChange(monitorUrl, lastStoredTimestamp) {
    try {
        const response = await fetch(monitorUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const timestampElement = $('.content-timestamp time');
        const currentTimestamp = timestampElement.attr('datetime');
        
        if (!currentTimestamp) {
            throw new Error('No timestamp found on page');
        }
        
        const updateNeeded = !lastStoredTimestamp || currentTimestamp !== lastStoredTimestamp;
        
        console.log(`📊 Current: ${currentTimestamp}, Stored: ${lastStoredTimestamp || 'None'}, Update: ${updateNeeded ? 'YES' : 'NO'}`);
        
        return {
            updateNeeded,
            currentTimestamp,
            lastStoredTimestamp
        };
        
    } catch (error) {
        throw error;
    }
}

// [Include the scraping functions from the previous file]
async function scrapeAllPositions(datawrapperUrls) {
    const results = {};
    const browser = await chromium.launch();
    
    try {
        for (const [position, urls] of Object.entries(datawrapperUrls)) {
            if (!urls || urls.length === 0) {
                results[position] = [];
                continue;
            }
            
            console.log(`🔍 Scraping ${position.toUpperCase()}`);
            const rankings = await scrapePosition(browser, position, urls);
            results[position] = rankings;
            console.log(`  ✅ ${rankings.length} players`);
            
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
            const page = await browser.newPage();
            
            try {
                await page.goto(url, { timeout: 30000 });
                await page.waitForSelector('table', { timeout: 15000 });
                await page.waitForTimeout(3000);
                
                const rankings = [];
                const rows = await page.locator('tbody tr[class*="svelte"]').all();
                
                for (const row of rows) {
                    try {
                        const rankingData = await extractRowData(row, position);
                        if (rankingData) {
                            rankings.push(rankingData);
                        }
                    } catch (e) {
                        // Skip invalid rows
                    }
                }
                
                await page.close();
                
                if (rankings.length > 0) {
                    return rankings;
                }
                
            } catch (e) {
                await page.close();
                throw e;
            }
            
        } catch (error) {
            console.log(`    ❌ Error: ${error.message}`);
        }
    }
    
    return [];
}

async function extractRowData(row, position) {
    try {
        const rankElem = row.locator('th[class*="svelte"]').first();
        const rank = await rankElem.innerText();
        const rankNum = rank.trim();
        
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
    const rbKeywords = ['McCaffrey', 'Henry', 'Cook', 'Kamara', 'Barkley'];
    const wrKeywords = ['Chase', 'Jefferson', 'Hill', 'Adams', 'Evans'];
    const teKeywords = ['Kelce', 'Andrews', 'Kittle', 'Waller'];
    
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
    
    return 'RB';
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