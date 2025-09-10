// Smart CSV scraper that auto-discovers and scrapes in one go
const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    console.log('🤖 Smart CSV scraper with auto-discovery...');
    
    try {
        // Parse request body
        const body = event.body ? JSON.parse(event.body) : {};
        const testMode = body.test || false;
        
        const config = {
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
        
        const results = {};
        const discoveryLog = {};
        
        for (const [position, urls] of Object.entries(config.datawrapper_urls)) {
            if (!urls || urls.length === 0) {
                results[position] = [];
                discoveryLog[position] = { error: 'No URLs configured' };
                continue;
            }
            
            console.log(`🔍 Processing ${position.toUpperCase()}...`);
            
            // Step 1: Auto-discover CSV URL
            const discovery = await discoverAndScrapeCSV(position, urls[0]);
            results[position] = discovery.rankings;
            discoveryLog[position] = discovery.log;
            
            console.log(`  ✅ ${discovery.rankings.length} players found`);
        }
        
        const totalPlayers = Object.values(results).reduce((sum, rankings) => sum + rankings.length, 0);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                testMode: testMode,
                totalPlayers: totalPlayers,
                breakdown: Object.entries(results).map(([pos, data]) => `${pos.toUpperCase()}: ${data.length}`).join(', '),
                sampleData: Object.fromEntries(
                    Object.entries(results).map(([pos, data]) => [pos, data.slice(0, 3)])
                ),
                discoveryLog: discoveryLog,
                data: testMode ? results : undefined
            }, null, 2)
        };
        
    } catch (error) {
        console.error('❌ Error in smart CSV scraper:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

async function discoverAndScrapeCSV(position, datawrapperUrl) {
    const log = {
        originalUrl: datawrapperUrl,
        discoveredCsvUrls: [],
        workingCsvUrl: null,
        csvPreview: null,
        parseAttempts: [],
        finalCount: 0
    };
    
    try {
        // Auto-discover CSV URLs
        const csvUrls = await findCSVUrls(datawrapperUrl, log);
        
        if (csvUrls.length === 0) {
            log.error = 'No CSV URLs could be discovered';
            return { rankings: [], log };
        }
        
        // Try each discovered CSV URL
        for (const csvUrl of csvUrls) {
            try {
                console.log(`    📊 Testing CSV: ${csvUrl}`);
                
                const response = await fetch(csvUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                    },
                    timeout: 15000
                });
                
                if (!response.ok) {
                    log.parseAttempts.push({ url: csvUrl, error: `HTTP ${response.status}` });
                    continue;
                }
                
                const csvText = await response.text();
                log.workingCsvUrl = csvUrl;
                log.csvPreview = csvText.split('\n').slice(0, 3);
                
                const rankings = parseFlexibleCSV(csvText, position, log);
                
                if (rankings.length > 0) {
                    log.finalCount = rankings.length;
                    log.parseAttempts.push({ url: csvUrl, success: true, count: rankings.length });
                    return { rankings, log };
                }
                
                log.parseAttempts.push({ url: csvUrl, error: 'No valid data parsed' });
                
            } catch (error) {
                log.parseAttempts.push({ url: csvUrl, error: error.message });
            }
        }
        
        return { rankings: [], log };
        
    } catch (error) {
        log.error = error.message;
        return { rankings: [], log };
    }
}

async function findCSVUrls(datawrapperUrl, log) {
    const csvUrls = [];
    
    try {
        // Fetch the page
        const response = await fetch(datawrapperUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            timeout: 15000
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Method 1: Direct CSV links
        $('a[href*="dataset.csv"], a[href*=".csv"]').each((i, elem) => {
            const href = $(elem).attr('href');
            if (href) {
                const fullUrl = new URL(href, datawrapperUrl).href;
                csvUrls.push(fullUrl);
            }
        });
        
        // Method 2: Extract chart ID from various sources
        let chartId = null;
        
        // From URL
        const urlMatch = datawrapperUrl.match(/\/([a-zA-Z0-9]{5,})\/?\??/);
        if (urlMatch) {
            chartId = urlMatch[1];
        }
        
        // From page content
        if (!chartId) {
            const pageContent = html;
            const patterns = [
                /"chartId":\s*"([a-zA-Z0-9]{5,})"/,
                /"id":\s*"([a-zA-Z0-9]{5,})"/,
                /data-chart-id="([a-zA-Z0-9]{5,})"/,
                /chart\/([a-zA-Z0-9]{5,})/
            ];
            
            for (const pattern of patterns) {
                const match = pageContent.match(pattern);
                if (match) {
                    chartId = match[1];
                    break;
                }
            }
        }
        
        if (chartId) {
            // Generate potential CSV URLs
            const potentialUrls = [
                `https://datawrapper.dwcdn.net/${chartId}/dataset.csv`,
                `https://datawrapper.dwcdn.net/${chartId}/1/dataset.csv`,
                `https://datawrapper.dwcdn.net/${chartId}/2/dataset.csv`,
                `https://datawrapper.dwcdn.net/${chartId}/3/dataset.csv`
            ];
            
            csvUrls.push(...potentialUrls);
        }
        
        // Remove duplicates
        const uniqueUrls = [...new Set(csvUrls)];
        log.discoveredCsvUrls = uniqueUrls;
        
        return uniqueUrls;
        
    } catch (error) {
        log.discoveryError = error.message;
        return [];
    }
}

function parseFlexibleCSV(csvText, position, log) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const rankings = [];
    const header = lines[0];
    log.csvHeader = header;
    
    // Analyze header to determine field positions
    const headerFields = parseCSVLine(header.toLowerCase());
    const fieldMap = {
        rank: findFieldIndex(headerFields, ['rank', 'ranking', '#']),
        player: findFieldIndex(headerFields, ['player', 'name', 'playername']),
        opponent: findFieldIndex(headerFields, ['opp', 'opponent', 'matchup', 'vs']),
        team: findFieldIndex(headerFields, ['team', 'tm', 'abbrev'])
    };
    
    log.fieldMapping = fieldMap;
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
        try {
            const line = lines[i];
            if (!line.trim()) continue;
            
            const fields = parseCSVLine(line);
            if (fields.length < 3) continue;
            
            // Extract data using field mapping
            let rank = extractRank(fields, fieldMap);
            let player = extractPlayer(fields, fieldMap);
            let opponent = extractOpponent(fields, fieldMap);
            
            // Fallback parsing if field mapping failed
            if (!rank || !player) {
                const fallback = fallbackParse(fields);
                rank = rank || fallback.rank;
                player = player || fallback.player;
                opponent = opponent || fallback.opponent;
            }
            
            if (!rank || !player || rank < 1 || rank > 200) continue;
            
            const rankingData = {
                preGameRank: rank,
                player: cleanText(player),
                opponent: cleanText(opponent) || 'TBD'
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
    
    rankings.sort((a, b) => a.preGameRank - b.preGameRank);
    return rankings;
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

function extractRank(fields, fieldMap) {
    if (fieldMap.rank >= 0) {
        return parseInt(fields[fieldMap.rank]);
    }
    
    // Try first few fields for rank
    for (let i = 0; i < Math.min(4, fields.length); i++) {
        const parsed = parseInt(fields[i]);
        if (parsed && parsed > 0 && parsed < 200) {
            return parsed;
        }
    }
    return null;
}

function extractPlayer(fields, fieldMap) {
    if (fieldMap.player >= 0) {
        return fields[fieldMap.player];
    }
    
    // Look for field that seems like a player name
    for (let i = 1; i < Math.min(6, fields.length); i++) {
        const field = cleanText(fields[i]);
        if (field && field.length > 3 && field.includes(' ') && !field.match(/^\d+$/)) {
            return field;
        }
    }
    return null;
}

function extractOpponent(fields, fieldMap) {
    if (fieldMap.opponent >= 0) {
        return fields[fieldMap.opponent];
    }
    
    // Look in last few fields for opponent info
    for (let i = Math.max(0, fields.length - 3); i < fields.length; i++) {
        const field = cleanText(fields[i]);
        if (field && (field.includes('vs') || field.includes('@') || field.match(/^[A-Z]{2,3}$/))) {
            return field;
        }
    }
    return null;
}

function fallbackParse(fields) {
    // Basic fallback: assume rank, player, ..., opponent pattern
    return {
        rank: parseInt(fields[0]) || parseInt(fields[1]),
        player: fields[1] || fields[2],
        opponent: fields[fields.length - 1]
    };
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
    const rbKeywords = ['McCaffrey', 'Barkley', 'Henry', 'Cook', 'Kamara', 'Robinson', 'Gibbs', 'Walker', 'Jacobs'];
    const wrKeywords = ['Chase', 'Jefferson', 'Hill', 'Adams', 'Evans', 'Brown', 'Lamb', 'Kupp', 'Diggs'];
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