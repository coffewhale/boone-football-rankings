// Smart Automated Scraper with CSV-based scraping (faster than Playwright)
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

exports.handler = async (event, context) => {
    console.log('🤖 Starting smart automated Boone rankings check...');
    
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
                    message: `Outside active hours (${etHour}:00 ET). Next check: 6 AM ET.`
                })
            };
        }
        
        // Get configuration
        const config = await getConfig();
        
        if (!config.monitor_url || !config.flex_urls.length) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Missing monitor URL or FLEX URLs - check environment variables'
                })
            };
        }
        
        // STEP 1: Check Yahoo timestamp (lightweight check)
        console.log('🕐 STEP 1: Checking Yahoo article timestamp...');
        const timestampResult = await checkTimestampChange(config.monitor_url, config.last_stored_timestamp);
        
        if (!timestampResult.updateNeeded) {
            console.log('✅ No timestamp change detected - rankings are current');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    updateNeeded: false,
                    message: 'No timestamp change - rankings are current',
                    currentTimestamp: timestampResult.currentTimestamp,
                    storedTimestamp: timestampResult.lastStoredTimestamp
                })
            };
        }
        
        console.log('🚨 Timestamp change detected! Proceeding to content verification...');
        
        // STEP 2: Quick FLEX check (smart verification)
        console.log('🏈 STEP 2: Checking FLEX rankings for actual content changes...');
        const contentChangeResult = await checkForActualContentChanges(config.flex_urls);
        
        if (!contentChangeResult.hasChanges) {
            console.log('✅ FLEX data unchanged - timestamp change was false alarm');
            console.log('💡 TIP: Update LAST_STORED_TIMESTAMP to prevent future false checks');
            
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    updateNeeded: false,
                    message: 'Timestamp changed but FLEX data is identical - no update needed',
                    currentTimestamp: timestampResult.currentTimestamp,
                    flexSample: contentChangeResult.sampleData,
                    note: 'Consider updating LAST_STORED_TIMESTAMP to: ' + timestampResult.currentTimestamp
                })
            };
        }
        
        console.log('🚨 FLEX data has changed! Proceeding with full scraping...');
        
        // STEP 3: Full scraping (expensive operation)
        console.log('⚡ STEP 3: Full scraping of all positions...');
        const results = await scrapeAllPositions(config.datawrapper_urls);
        
        const totalPlayers = Object.values(results).reduce((sum, rankings) => sum + rankings.length, 0);
        
        if (totalPlayers === 0) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    error: 'Scraping failed - no data retrieved from any position'
                })
            };
        }
        
        // STEP 4: Compare with existing data (final safety check)
        console.log('🔍 STEP 4: Comparing with existing rankings for changes...');
        const comparisonResult = await compareWithExistingRankings(results);
        
        if (!comparisonResult.hasChanges) {
            console.log('✅ Scraped data is identical to existing rankings - no file update needed');
            
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    updateNeeded: false,
                    message: 'Data scraped but identical to existing rankings - no update needed',
                    totalPlayers: totalPlayers,
                    currentTimestamp: timestampResult.currentTimestamp,
                    note: 'Consider updating LAST_STORED_TIMESTAMP to: ' + timestampResult.currentTimestamp
                })
            };
        }
        
        console.log('🎯 Real changes detected! Updating rankings...');
        
        // STEP 5: Update files (only when real changes exist)
        console.log('💾 STEP 5: Updating rankings.json with new data...');
        const updateResult = await updateRankingsFile(results, timestampResult.currentTimestamp);
        
        console.log('🎉 SUCCESS! Rankings updated with real changes');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                updateNeeded: true,
                totalPlayers: totalPlayers,
                currentTimestamp: timestampResult.currentTimestamp,
                changesDetected: comparisonResult.changesSummary,
                commitInfo: updateResult,
                message: 'Rankings successfully updated via GitHub commit!',
                manualStep: 'Update LAST_STORED_TIMESTAMP environment variable to: ' + timestampResult.currentTimestamp
            })
        };
        
    } catch (error) {
        console.error('❌ Error in smart automated scraper:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};

async function getConfig() {
    const config = {
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
        },
        flex_urls: (process.env.FLEX_URLS || "").split(',').filter(url => url.trim())
    };
    
    console.log('📋 Configuration loaded:');
    console.log(`  Monitor URL: ${config.monitor_url ? '✅' : '❌'}`);
    console.log(`  Stored timestamp: ${config.last_stored_timestamp || 'None'}`);
    console.log(`  FLEX URLs: ${config.flex_urls.length} configured`);
    
    const totalUrls = Object.values(config.datawrapper_urls).reduce((sum, urls) => sum + urls.length, 0);
    console.log(`  Total Datawrapper URLs: ${totalUrls}`);
    
    return config;
}

async function checkTimestampChange(monitorUrl, lastStoredTimestamp) {
    try {
        console.log(`🔍 Checking timestamp at: ${monitorUrl}`);
        
        const response = await fetch(monitorUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 15000
        });
        
        if (!response.ok) {
            throw new Error(`Yahoo article request failed: HTTP ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Look for timestamp in various selectors
        const selectors = ['.content-timestamp time', 'time[datetime]', '[data-timestamp]'];
        let currentTimestamp = null;
        
        for (const selector of selectors) {
            const element = $(selector);
            if (element.length > 0) {
                currentTimestamp = element.attr('datetime') || element.attr('data-timestamp');
                if (currentTimestamp) break;
            }
        }
        
        if (!currentTimestamp) {
            throw new Error('No timestamp found on Yahoo article page');
        }
        
        const updateNeeded = !lastStoredTimestamp || currentTimestamp !== lastStoredTimestamp;
        
        console.log(`📊 Timestamp comparison:`);
        console.log(`    Current: ${currentTimestamp}`);
        console.log(`    Stored:  ${lastStoredTimestamp || 'None'}`);
        console.log(`    Update:  ${updateNeeded ? 'NEEDED' : 'Not needed'}`);
        
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

async function checkForActualContentChanges(flexUrls) {
    console.log('🏈 Performing quick FLEX content check...');
    
    if (!flexUrls || flexUrls.length === 0) {
        console.log('⚠️ No FLEX URLs configured - assuming changes exist');
        return { hasChanges: true, reason: 'No FLEX URLs to check' };
    }
    
    const browser = await chromium.launch();
    let page;
    
    try {
        page = await browser.newPage();
        
        for (const url of flexUrls) {
            try {
                console.log(`  Checking FLEX URL: ${url}`);
                
                await page.goto(url, { timeout: 20000 });
                await page.waitForSelector('table', { timeout: 15000 });
                await page.waitForTimeout(2000);
                
                // Get first 10 FLEX rankings as a sample
                const sampleData = [];
                const rows = await page.locator('tbody tr[class*="svelte"]').all();
                
                for (let i = 0; i < Math.min(10, rows.length); i++) {
                    try {
                        const row = rows[i];
                        const rankElem = row.locator('th[class*="svelte"]').first();
                        const rank = await rankElem.innerText();
                        
                        const tdElements = await row.locator('td[class*="svelte"]').all();
                        if (tdElements.length >= 2) {
                            const player = await tdElements[0].innerText();
                            sampleData.push({
                                rank: rank.trim(),
                                player: player.trim()
                            });
                        }
                    } catch (e) {
                        // Skip invalid rows
                    }
                }
                
                console.log(`  Sample FLEX data: ${sampleData.length} players`);
                if (sampleData.length > 0) {
                    console.log(`    Top 3: ${sampleData.slice(0, 3).map(p => `${p.rank}. ${p.player}`).join(', ')}`);
                }
                
                // Compare with existing rankings.json if it exists
                try {
                    const existingRankings = JSON.parse(await fs.readFile(path.join(process.cwd(), 'rankings.json'), 'utf8'));
                    const existingFlex = existingRankings.flex || [];
                    
                    // Compare first few players
                    const existingSample = existingFlex.slice(0, Math.min(10, existingFlex.length));
                    
                    let changesFound = false;
                    
                    if (sampleData.length !== existingSample.length) {
                        changesFound = true;
                        console.log(`  🔄 Length changed: ${existingSample.length} → ${sampleData.length}`);
                    } else {
                        for (let i = 0; i < sampleData.length; i++) {
                            const newPlayer = sampleData[i];
                            const existingPlayer = existingSample[i];
                            
                            if (!existingPlayer || 
                                newPlayer.player !== existingPlayer.player ||
                                parseInt(newPlayer.rank) !== existingPlayer.preGameRank) {
                                changesFound = true;
                                console.log(`  🔄 Rank ${i + 1} changed: ${existingPlayer?.player || 'None'} → ${newPlayer.player}`);
                                break;
                            }
                        }
                    }
                    
                    if (!changesFound) {
                        console.log('  ✅ FLEX sample data unchanged - no real content changes');
                        return { 
                            hasChanges: false, 
                            sampleData: sampleData.slice(0, 5),
                            reason: 'FLEX content identical to existing data'
                        };
                    } else {
                        console.log('  🚨 FLEX content has changed - real updates detected!');
                        return { 
                            hasChanges: true, 
                            sampleData: sampleData.slice(0, 5),
                            reason: 'FLEX content changes detected'
                        };
                    }
                    
                } catch (fileError) {
                    console.log('  ℹ️ No existing rankings.json to compare - assuming changes exist');
                    return { 
                        hasChanges: true, 
                        sampleData: sampleData.slice(0, 5),
                        reason: 'No existing file to compare'
                    };
                }
                
            } catch (urlError) {
                console.log(`  ❌ Error checking FLEX URL: ${urlError.message}`);
                continue;
            }
        }
        
        console.log('  ⚠️ Could not check FLEX content - assuming changes exist');
        return { hasChanges: true, reason: 'FLEX check failed' };
        
    } finally {
        if (page) await page.close();
        await browser.close();
    }
}

async function compareWithExistingRankings(newResults) {
    try {
        console.log('🔍 Comparing new results with existing rankings...');
        
        const existingData = JSON.parse(await fs.readFile(path.join(process.cwd(), 'rankings.json'), 'utf8'));
        
        // Create hashes for comparison
        const newHash = createDataHash(newResults);
        const existingHash = createDataHash(existingData);
        
        if (newHash === existingHash) {
            console.log('✅ Data hashes match - no changes detected');
            return { hasChanges: false, reason: 'Identical data hashes' };
        }
        
        // Detailed comparison
        const changes = [];
        const positions = ['qb', 'rb', 'wr', 'te', 'flex', 'def', 'k'];
        
        for (const position of positions) {
            const newCount = (newResults[position] || []).length;
            const existingCount = (existingData[position] || []).length;
            
            if (newCount !== existingCount) {
                changes.push(`${position.toUpperCase()}: ${existingCount} → ${newCount} players`);
            }
        }
        
        console.log(`🔄 Changes detected: ${changes.length > 0 ? changes.join(', ') : 'Content differences found'}`);
        
        return {
            hasChanges: true,
            changesSummary: changes.length > 0 ? changes : ['Content changes detected'],
            reason: 'Data comparison shows differences'
        };
        
    } catch (error) {
        console.log('ℹ️ Cannot compare with existing file - assuming changes exist');
        return { hasChanges: true, reason: 'No existing file to compare' };
    }
}

function createDataHash(data) {
    // Create a hash of the essential data (excluding timestamps, etc.)
    const essentialData = {};
    const positions = ['qb', 'rb', 'wr', 'te', 'flex', 'def', 'k'];
    
    positions.forEach(position => {
        const rankings = data[position] || [];
        essentialData[position] = rankings.map(player => ({
            rank: player.preGameRank,
            player: player.player,
            opponent: player.opponent
        }));
    });
    
    return crypto.createHash('md5').update(JSON.stringify(essentialData)).digest('hex');
}

async function updateRankingsFile(results, currentTimestamp) {
    try {
        console.log('💾 Updating rankings.json via GitHub API...');
        
        const githubToken = process.env.GITHUB_TOKEN;
        const repo = process.env.GITHUB_REPO || 'coffewhale/boone-football-rankings';
        
        if (!githubToken) {
            throw new Error('GITHUB_TOKEN environment variable not set');
        }
        
        // Add metadata to results
        const outputData = {
            ...results,
            lastUpdated: currentTimestamp || new Date().toISOString(),
            week: getCurrentWeekNumber(),
            scrapedAt: new Date().toISOString(),
            scrapingMethod: 'Timestamp-Triggered-CSV',
            totalPlayers: Object.values(results).reduce((sum, rankings) => sum + rankings.length, 0)
        };
        
        // Get current file SHA (if it exists)
        let sha = null;
        try {
            const getCurrentFile = await fetch(`https://api.github.com/repos/${repo}/contents/rankings.json`, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'User-Agent': 'Boone-Rankings-Bot'
                }
            });
            
            if (getCurrentFile.ok) {
                const currentFileData = await getCurrentFile.json();
                sha = currentFileData.sha;
            }
        } catch (e) {
            console.log('📄 No existing rankings.json found, will create new file');
        }
        
        // Prepare the new content
        const content = JSON.stringify(outputData, null, 2);
        const encodedContent = Buffer.from(content).toString('base64');
        
        // Update the file via GitHub API
        const updateResponse = await fetch(`https://api.github.com/repos/${repo}/contents/rankings.json`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'User-Agent': 'Boone-Rankings-Bot',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update Week ${outputData.week} rankings - ${outputData.totalPlayers} players\n\n🤖 Triggered by timestamp change: ${currentTimestamp}`,
                content: encodedContent,
                ...(sha && { sha }) // Include SHA only if file exists
            })
        });
        
        if (!updateResponse.ok) {
            const errorData = await updateResponse.text();
            throw new Error(`GitHub API error: ${updateResponse.status} - ${errorData}`);
        }
        
        const result = await updateResponse.json();
        console.log('✅ rankings.json updated successfully via GitHub API');
        console.log(`🔗 Commit: ${result.commit.html_url}`);
        
        // Log summary
        const summary = Object.entries(results).map(([position, rankings]) => 
            `${position.toUpperCase()}: ${rankings.length}`
        ).join(', ');
        console.log(`📊 Updated rankings: ${summary}`);
        
        return {
            commitSha: result.commit.sha,
            commitUrl: result.commit.html_url,
            totalPlayers: outputData.totalPlayers
        };
        
    } catch (error) {
        console.error('❌ Error updating rankings via GitHub:', error);
        throw error;
    }
}

// CSV-based scraping functions (much faster than Playwright)
async function scrapeAllPositions(datawrapperUrls) {
    const results = {};
    
    for (const [position, urls] of Object.entries(datawrapperUrls)) {
        if (!urls || urls.length === 0) {
            results[position] = [];
            continue;
        }
        
        console.log(`🔍 Scraping ${position.toUpperCase()} from ${urls.length} CSV URL(s)`);
        const rankings = await scrapePositionCSV(position, urls);
        results[position] = rankings;
        console.log(`  ✅ ${rankings.length} players`);
    }
    
    return results;
}

async function scrapePositionCSV(position, urls) {
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        
        try {
            console.log(`  Attempting CSV URL ${i + 1}/${urls.length}`);
            
            // Convert Datawrapper URL to CSV endpoint
            const csvUrl = convertToCSVEndpoint(url);
            console.log(`  CSV endpoint: ${csvUrl}`);
            
            const response = await fetch(csvUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 15000
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const csvText = await response.text();
            const rankings = parseCSVData(csvText, position);
            
            if (rankings.length > 0) {
                console.log(`    ✅ ${rankings.length} players parsed from CSV`);
                return rankings;
            }
            
        } catch (error) {
            console.log(`    ❌ Error: ${error.message}`);
        }
    }
    
    return [];
}

function convertToCSVEndpoint(datawrapperUrl) {
    // Convert various Datawrapper URL formats to CSV endpoint
    
    // Format 1: https://datawrapper.dwcdn.net/bqgx9/ -> https://datawrapper.dwcdn.net/bqgx9/1/dataset.csv
    if (datawrapperUrl.includes('datawrapper.dwcdn.net')) {
        const match = datawrapperUrl.match(/datawrapper\.dwcdn\.net\/([^\/]+)/);
        if (match) {
            return `https://datawrapper.dwcdn.net/${match[1]}/1/dataset.csv`;
        }
    }
    
    // Format 2: https://www.datawrapper.de/_/hPdJB/ -> https://datawrapper.dwcdn.net/hPdJB/1/dataset.csv
    if (datawrapperUrl.includes('www.datawrapper.de/_/')) {
        const match = datawrapperUrl.match(/www\.datawrapper\.de\/_\/([^\/]+)/);
        if (match) {
            return `https://datawrapper.dwcdn.net/${match[1]}/1/dataset.csv`;
        }
    }
    
    // Fallback: try to extract chart ID
    const chartIdMatch = datawrapperUrl.match(/([a-zA-Z0-9]{5,})/);
    if (chartIdMatch) {
        return `https://datawrapper.dwcdn.net/${chartIdMatch[1]}/1/dataset.csv`;
    }
    
    throw new Error(`Cannot convert URL to CSV endpoint: ${datawrapperUrl}`);
}

function parseCSVData(csvText, position) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const rankings = [];
    
    // Skip header row (index 0)
    for (let i = 1; i < lines.length; i++) {
        try {
            const line = lines[i];
            if (!line.trim()) continue;
            
            // Parse CSV line - handle quotes and commas properly
            const fields = parseCSVLine(line);
            
            if (fields.length < 5) continue;
            
            // Expected format: ,Abbrev Tm,Rank,Player,Team,Opp
            // fields[0] = empty, fields[1] = team abbrev, fields[2] = rank, fields[3] = player, fields[4] = team logo, fields[5] = opponent
            
            const rank = parseInt(fields[2]);
            const player = cleanPlayerName(fields[3]);
            const opponent = cleanOpponent(fields[5] || fields[4]); // Try both positions for opponent
            
            if (!rank || !player || rank < 1 || rank > 100) continue;
            
            const rankingData = {
                preGameRank: rank,
                player: player,
                opponent: opponent
            };
            
            // Add position rank for FLEX
            if (position === 'flex') {
                const guessedPosition = guessPosition(player);
                rankingData.positionRank = `${guessedPosition}${rank}`;
            }
            
            rankings.push(rankingData);
            
        } catch (e) {
            // Skip invalid rows
            continue;
        }
    }
    
    // Sort by rank to ensure proper order
    rankings.sort((a, b) => a.preGameRank - b.preGameRank);
    
    return rankings;
}

function parseCSVLine(line) {
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(currentField);
            currentField = '';
        } else {
            currentField += char;
        }
    }
    
    fields.push(currentField); // Add the last field
    return fields;
}

function cleanPlayerName(player) {
    if (!player) return '';
    
    // Remove HTML img tags and other markup
    return player
        .replace(/!\[.*?\]\(.*?\)/g, '') // Remove markdown images
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .trim();
}

function cleanOpponent(opponent) {
    if (!opponent) return '';
    
    // Extract opponent from various formats
    return opponent
        .replace(/!\[.*?\]\(.*?\)/g, '') // Remove markdown images
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .trim();
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

function getCurrentWeekNumber() {
    // Calculate current NFL week based on season start
    const seasonStart = new Date('2025-09-05'); // Adjust for actual season start
    const now = new Date();
    const weeksDiff = Math.floor((now - seasonStart) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(18, weeksDiff + 1));
}