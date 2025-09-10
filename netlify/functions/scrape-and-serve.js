// Combined scraper that provides fresh data directly (bypasses file system)
const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    console.log('🚀 Scrape-and-serve: providing fresh rankings data...');
    
    try {
        const config = {
            datawrapper_urls: {
                qb: (process.env.QB_URLS || "").split(',').filter(url => url.trim()),
                rb: (process.env.RB_URLS || "").split(',').filter(url => url.trim()),
                wr: (process.env.WR_URLS || "").split(',').filter(url => url.trim()),
                te: (process.env.TE_URLS || "").split(',').filter(url => url.trim()),
                flex: (process.env.FLEX_URLS || "").split(',').filter(url => url.trim()),
                def: (process.env.DEF_URLS || "").split(',').filter(url => url.trim()),
                k: (process.env.K_URLS || "").split(',').filter(url => url.trim())
            },
            monitor_url: process.env.MONITOR_URL || ""
        };
        
        // Get timestamp from Yahoo article
        let articleTimestamp = null;
        if (config.monitor_url) {
            try {
                const response = await fetch(config.monitor_url, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Boone-Rankings-Bot)' },
                    timeout: 10000
                });
                
                if (response.ok) {
                    const html = await response.text();
                    const $ = cheerio.load(html);
                    
                    const selectors = ['.content-timestamp time', 'time[datetime]', '[data-timestamp]'];
                    for (const selector of selectors) {
                        const element = $(selector);
                        if (element.length > 0) {
                            articleTimestamp = element.attr('datetime') || element.attr('data-timestamp');
                            if (articleTimestamp) break;
                        }
                    }
                }
            } catch (e) {
                console.log('Could not fetch article timestamp:', e.message);
            }
        }
        
        // Scrape all positions
        const results = {};
        let totalPlayers = 0;
        
        for (const [position, urls] of Object.entries(config.datawrapper_urls)) {
            if (!urls || urls.length === 0) {
                results[position] = [];
                continue;
            }
            
            console.log(`🔍 Scraping ${position.toUpperCase()}...`);
            const rankings = await scrapePositionWithDiscovery(position, urls[0]);
            results[position] = rankings;
            totalPlayers += rankings.length;
            console.log(`  ✅ ${rankings.length} players`);
        }
        
        // Create final data structure
        const outputData = {
            ...results,
            lastUpdated: articleTimestamp || new Date().toISOString(),
            week: getCurrentWeekNumber(),
            scrapedAt: new Date().toISOString(),
            scrapingMethod: 'Live-CSV-Discovery',
            totalPlayers: totalPlayers
        };
        
        console.log(`🎉 Total: ${totalPlayers} players across all positions`);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(outputData, null, 2)
        };
        
    } catch (error) {
        console.error('❌ Error in scrape-and-serve:', error);
        
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

async function scrapePositionWithDiscovery(position, datawrapperUrl) {
    try {
        // Auto-discover CSV URLs
        const csvUrls = await findCSVUrls(datawrapperUrl);
        
        if (csvUrls.length === 0) {
            console.log(`  ❌ No CSV URLs found for ${position}`);
            return [];
        }
        
        // Try each discovered CSV URL
        for (const csvUrl of csvUrls) {
            try {
                console.log(`    📊 Testing: ${csvUrl}`);
                
                const response = await fetch(csvUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    timeout: 15000
                });
                
                if (!response.ok) continue;
                
                const csvText = await response.text();
                const rankings = parseFlexibleCSV(csvText, position);
                
                if (rankings.length > 0) {
                    console.log(`    ✅ ${rankings.length} players from CSV`);
                    return rankings;
                }
                
            } catch (error) {
                console.log(`    ❌ CSV error: ${error.message}`);
            }
        }
        
        return [];
        
    } catch (error) {
        console.log(`  ❌ Discovery error for ${position}: ${error.message}`);
        return [];
    }
}

async function findCSVUrls(datawrapperUrl) {
    const csvUrls = [];
    
    try {
        const response = await fetch(datawrapperUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
        });
        
        if (!response.ok) return [];
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Extract chart ID
        let chartId = null;
        
        const urlMatch = datawrapperUrl.match(/\/([a-zA-Z0-9]{5,})\/?\??/);
        if (urlMatch) {
            chartId = urlMatch[1];
        }
        
        if (!chartId) {
            const patterns = [
                /"chartId":\s*"([a-zA-Z0-9]{5,})"/,
                /"id":\s*"([a-zA-Z0-9]{5,})"/,
                /chart\/([a-zA-Z0-9]{5,})/
            ];
            
            for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match) {
                    chartId = match[1];
                    break;
                }
            }
        }
        
        if (chartId) {
            csvUrls.push(
                `https://datawrapper.dwcdn.net/${chartId}/dataset.csv`,
                `https://datawrapper.dwcdn.net/${chartId}/1/dataset.csv`,
                `https://datawrapper.dwcdn.net/${chartId}/2/dataset.csv`
            );
        }
        
        return [...new Set(csvUrls)];
        
    } catch (error) {
        return [];
    }
}

function parseFlexibleCSV(csvText, position) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const rankings = [];
    const header = lines[0].toLowerCase();
    
    // Determine field positions
    const headerFields = parseCSVLine(header);
    const fieldMap = {
        rank: findFieldIndex(headerFields, ['rank', '#']),
        player: findFieldIndex(headerFields, ['player', 'name']),
        opponent: findFieldIndex(headerFields, ['opp', 'opponent', 'vs'])
    };
    
    for (let i = 1; i < lines.length; i++) {
        try {
            const fields = parseCSVLine(lines[i]);
            if (fields.length < 3) continue;
            
            let rank = extractField(fields, fieldMap.rank) || extractField(fields, [0, 1, 2]);
            let player = extractField(fields, fieldMap.player) || extractField(fields, [1, 2, 3]);
            let opponent = extractField(fields, fieldMap.opponent) || extractField(fields, [-1, -2]);
            
            rank = parseInt(rank);
            player = cleanText(player);
            opponent = cleanText(opponent);
            
            if (!rank || !player || rank < 1 || rank > 200) continue;
            
            const rankingData = {
                preGameRank: rank,
                player: player,
                opponent: opponent || 'TBD'
            };
            
            if (position === 'flex') {
                const guessedPosition = guessPosition(player);
                rankingData.positionRank = `${guessedPosition}${rank}`;
            }
            
            rankings.push(rankingData);
            
        } catch (e) {
            continue;
        }
    }
    
    return rankings.sort((a, b) => a.preGameRank - b.preGameRank);
}

function findFieldIndex(headerFields, possibleNames) {
    for (let i = 0; i < headerFields.length; i++) {
        const field = headerFields[i].toLowerCase().trim();
        if (possibleNames.some(name => field.includes(name))) {
            return i;
        }
    }
    return -1;
}

function extractField(fields, indexOrArray) {
    if (typeof indexOrArray === 'number') {
        if (indexOrArray < 0) {
            return fields[fields.length + indexOrArray];
        }
        return fields[indexOrArray];
    }
    
    if (Array.isArray(indexOrArray)) {
        for (const index of indexOrArray) {
            const value = extractField(fields, index);
            if (value && value.trim()) return value;
        }
    }
    
    return null;
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
    fields.push(currentField);
    return fields;
}

function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/\r/g, '')
        .trim();
}

function guessPosition(playerName) {
    const rbKeywords = ['McCaffrey', 'Barkley', 'Henry', 'Cook', 'Kamara'];
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

function getCurrentWeekNumber() {
    const seasonStart = new Date('2025-09-05');
    const now = new Date();
    const weeksDiff = Math.floor((now - seasonStart) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(18, weeksDiff + 1));
}