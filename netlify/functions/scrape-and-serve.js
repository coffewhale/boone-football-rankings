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
            console.log(`  📍 Using URL: ${urls[0]}`);
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
                
                if (!response.ok) {
                    console.log(`    ❌ HTTP ${response.status}: ${csvUrl}`);
                    continue;
                }
                
                const csvText = await response.text();
                console.log(`    📄 CSV length: ${csvText.length} chars`);
                const rankings = parseFlexibleCSV(csvText, position);
                
                if (rankings.length > 0) {
                    console.log(`    ✅ ${rankings.length} players from CSV`);
                    console.log(`    🎯 SUCCESS with: ${csvUrl}`);
                    return rankings;
                } else {
                    console.log(`    ❌ No valid data parsed from: ${csvUrl}`);
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
        
        // Look for actual CSV URLs in the HTML/JavaScript
        const csvUrlPatterns = [
            // Direct CSV URL references
            /https:\/\/datawrapper\.dwcdn\.net\/[a-zA-Z0-9]+\/\d*\/?dataset\.csv/g,
            // JSON config with CSV URLs
            /"csvUrl":\s*"([^"]*dataset\.csv[^"]*)"/g,
            /"dataUrl":\s*"([^"]*dataset\.csv[^"]*)"/g,
            // Script tags with CSV references
            /datawrapper\.dwcdn\.net\/([a-zA-Z0-9]+)\/(\d+)\/dataset\.csv/g
        ];
        
        for (const pattern of csvUrlPatterns) {
            let match;
            while ((match = pattern.exec(html)) !== null) {
                if (match[0].startsWith('http')) {
                    csvUrls.push(match[0]);
                } else if (match[1]) {
                    csvUrls.push(match[1]);
                }
            }
        }
        
        // If no direct URLs found, extract chart ID and try common patterns
        if (csvUrls.length === 0) {
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
                // Hardcoded for Week 2 - use /2/ version
                console.log(`  📅 Using hardcoded week 2 version: /2/`);
                
                csvUrls.push(
                    `https://datawrapper.dwcdn.net/${chartId}/2/dataset.csv`,
                    `https://datawrapper.dwcdn.net/${chartId}/dataset.csv`
                );
            }
        }
        
        const uniqueUrls = [...new Set(csvUrls)];
        console.log(`  🔍 Found CSV URLs: ${uniqueUrls.join(', ')}`);
        return uniqueUrls;
        
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
        player: findFieldIndex(headerFields, ['player', 'name', 'team']), // Add 'team' for defense
        opponent: findFieldIndex(headerFields, ['opp', 'opponent', 'vs']),
        position: findFieldIndex(headerFields, ['position', 'pos']) // For FLEX position detection
    };
    
    for (let i = 1; i < lines.length; i++) {
        try {
            const fields = parseCSVLine(lines[i]);
            if (fields.length < 3) continue;
            
            let rank, player, opponent;
            
            // Special handling for defense CSV format: ,,Rank,Team,Opp
            if (position === 'def' && fields.length >= 5) {
                rank = parseInt(fields[2]); // Column 2: Rank
                player = cleanText(fields[3]); // Column 3: Team 
                opponent = cleanText(fields[4]); // Column 4: Opp
            } else {
                // Standard logic for other positions
                rank = extractField(fields, fieldMap.rank) || extractField(fields, [0, 1, 2]);
                player = extractField(fields, fieldMap.player) || extractField(fields, [1, 2, 3]);
                opponent = extractField(fields, fieldMap.opponent) || extractField(fields, [-1, -2]);
                
                rank = parseInt(rank);
                player = cleanText(player);
                opponent = cleanText(opponent);
            }
            
            if (!rank || !player || rank < 1 || rank > 200) continue;
            
            const rankingData = {
                preGameRank: rank,
                player: player,
                opponent: opponent || 'TBD'
            };
            
            if (position === 'flex') {
                // Use actual position from CSV if available, otherwise guess
                let actualPosition = extractField(fields, fieldMap.position);
                if (!actualPosition) {
                    actualPosition = guessPosition(player);
                } else {
                    actualPosition = cleanText(actualPosition).toUpperCase();
                }
                rankingData.positionRank = `${actualPosition}${rank}`;
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
    const playerUpper = playerName.toUpperCase();
    
    // Comprehensive RB keywords
    const rbKeywords = [
        'MCCAFFREY', 'BARKLEY', 'HENRY', 'COOK', 'KAMARA', 'TAYLOR', 'ROBINSON', 'GIBBS',
        'CONNER', 'MIXON', 'JACOBS', 'POLLARD', 'WHITE', 'WALKER', 'ETIENNE', 'HARRIS',
        'MONTGOMERY', 'SWIFT', 'PIERCE', 'DOBBINS', 'WARREN', 'SINGLETARY', 'FOREMAN',
        'MOSTERT', 'HUNT', 'MITCHELL', 'DILLON', 'SPEARS', 'MASON', 'IRVING', 'HUBBARD',
        'JOHNSON', 'WILLIAMS', 'BROWN', 'JONES', 'DAVIS', 'GAINWELL', 'HERBERT',
        'MATTISON', 'ROBINSON', 'STRONG', 'DOWDLE', 'WILSON'
    ];
    
    // Comprehensive WR keywords  
    const wrKeywords = [
        'CHASE', 'JEFFERSON', 'HILL', 'ADAMS', 'EVANS', 'LAMB', 'DIGGS', 'HOPKINS',
        'KUPP', 'THOMAS', 'BROWN', 'METCALF', 'MCLAURIN', 'JOHNSON', 'SMITH',
        'COLLINS', 'WADDLE', 'COOPER', 'WILSON', 'MOORE', 'HIGGINS', 'RIDLEY',
        'LONDON', 'OLAVE', 'WILLIAMS', 'PUKA', 'DELL', 'FLORES', 'RICE', 'ADDISON',
        'PITTMAN', 'GODWIN', 'AIYUK', 'SAMUEL', 'ROBINSON', 'WATSON', 'PALMER',
        'NABERS', 'ODUNZE', 'HARRISON', 'FRANKLIN', 'MITCHELL', 'COOKS', 'LOCKETT'
    ];
    
    // Comprehensive TE keywords
    const teKeywords = [
        'KELCE', 'ANDREWS', 'KITTLE', 'WALLER', 'LAPORTE', 'HOCKENSON', 'PITTS',
        'GOEDERT', 'ERTZ', 'HENRY', 'NJOKU', 'SCHULTZ', 'ENGRAM', 'FERGUSON',
        'FREIERMUTH', 'KMET', 'TUCKER', 'KRAFT', 'STRANGE', 'CONKLIN', 'THOMAS'
    ];
    
    // Check each position
    for (const keyword of teKeywords) {
        if (playerUpper.includes(keyword)) return 'TE';
    }
    for (const keyword of wrKeywords) {
        if (playerUpper.includes(keyword)) return 'WR';
    }
    for (const keyword of rbKeywords) {
        if (playerUpper.includes(keyword)) return 'RB';
    }
    
    // If no match found, try to detect by common RB/WR patterns
    if (playerUpper.includes('JR.') || playerUpper.includes(' III') || playerUpper.includes(' II')) {
        // These are often WRs
        return 'WR';
    }
    
    // Default to WR instead of RB (more FLEX players are WRs than RBs typically)
    return 'WR';
}

function getCurrentWeekNumber() {
    // Use MONITOR_WEEK environment variable if set
    if (process.env.MONITOR_WEEK) {
        console.log(`Using MONITOR_WEEK: ${process.env.MONITOR_WEEK}`);
        return parseInt(process.env.MONITOR_WEEK);
    }
    
    // Fallback to calculated week
    console.log('No MONITOR_WEEK set, calculating from date');
    const seasonStart = new Date('2025-09-05');
    const now = new Date();
    const weeksDiff = Math.floor((now - seasonStart) / (7 * 24 * 60 * 60 * 1000));
    const calculatedWeek = Math.max(1, Math.min(18, weeksDiff + 1));
    console.log(`Calculated week: ${calculatedWeek}`);
    return calculatedWeek;
}