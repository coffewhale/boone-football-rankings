// Manual trigger for scraping - bypasses timestamp/schedule checks
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    console.log('🚀 Manual scraping triggered...');
    
    try {
        // Parse request body for optional parameters
        const body = event.body ? JSON.parse(event.body) : {};
        const forceUpdate = body.force || false;
        const testMode = body.test || false;
        
        // Get configuration
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
        
        console.log('📊 Scraping all positions manually...');
        const results = {};
        const detailed = {};
        
        for (const [position, urls] of Object.entries(config.datawrapper_urls)) {
            if (!urls || urls.length === 0) {
                results[position] = [];
                detailed[position] = { error: 'No URLs configured' };
                continue;
            }
            
            console.log(`🔍 Scraping ${position.toUpperCase()}...`);
            const scrapeResult = await scrapePositionCSV(position, urls);
            results[position] = scrapeResult.rankings;
            detailed[position] = scrapeResult.details;
            console.log(`  ✅ ${scrapeResult.rankings.length} players`);
        }
        
        const totalPlayers = Object.values(results).reduce((sum, rankings) => sum + rankings.length, 0);
        
        if (testMode) {
            // Test mode - just return data without saving
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    testMode: true,
                    totalPlayers: totalPlayers,
                    breakdown: Object.entries(results).map(([pos, data]) => `${pos.toUpperCase()}: ${data.length}`).join(', '),
                    sampleData: Object.fromEntries(
                        Object.entries(results).map(([pos, data]) => [pos, data.slice(0, 3)])
                    ),
                    detailed: detailed
                }, null, 2)
            };
        }
        
        if (totalPlayers === 0) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    error: 'No data retrieved from any position',
                    detailed: detailed
                })
            };
        }
        
        // In production, would save to file (but Netlify functions are read-only)
        // For now, just return the data
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                manualTrigger: true,
                totalPlayers: totalPlayers,
                breakdown: Object.entries(results).map(([pos, data]) => `${pos.toUpperCase()}: ${data.length}`).join(', '),
                note: "Data scraped successfully. In production, this would update rankings.json",
                timestamp: new Date().toISOString(),
                data: results
            }, null, 2)
        };
        
    } catch (error) {
        console.error('❌ Error in manual scraper:', error);
        
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

async function scrapePositionCSV(position, urls) {
    const details = {
        urlsTried: [],
        errors: [],
        csvFormat: null,
        totalLines: 0
    };
    
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        
        try {
            console.log(`  Attempting CSV URL ${i + 1}/${urls.length}`);
            
            // Convert Datawrapper URL to CSV endpoint
            const csvUrl = convertToCSVEndpoint(url);
            console.log(`  CSV endpoint: ${csvUrl}`);
            
            details.urlsTried.push({ original: url, csv: csvUrl });
            
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
            details.totalLines = csvText.split('\n').length;
            
            const rankings = parseCSVData(csvText, position, details);
            
            if (rankings.length > 0) {
                console.log(`    ✅ ${rankings.length} players parsed from CSV`);
                return { rankings, details };
            }
            
        } catch (error) {
            console.log(`    ❌ Error: ${error.message}`);
            details.errors.push(error.message);
        }
    }
    
    return { rankings: [], details };
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

function parseCSVData(csvText, position, details) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const rankings = [];
    
    // Analyze header to understand format
    const headerLine = lines[0];
    details.csvFormat = headerLine;
    
    console.log(`    📋 CSV Header: ${headerLine}`);
    
    // Skip header row (index 0)
    for (let i = 1; i < lines.length; i++) {
        try {
            const line = lines[i];
            if (!line.trim()) continue;
            
            // Parse CSV line - handle quotes and commas properly
            const fields = parseCSVLine(line);
            
            if (fields.length < 3) continue;
            
            // Try multiple field arrangements based on different CSV formats
            let rank, player, opponent;
            
            // Format A: ,Abbrev Tm,Rank,Player,Team,Opp (QB format)
            if (fields.length >= 6 && fields[2] && fields[3]) {
                rank = parseInt(fields[2]);
                player = cleanPlayerName(fields[3]);
                opponent = cleanOpponent(fields[5] || fields[4]);
            }
            // Format B: ,Rank,Player,Abbrev Tm,Team,Position,Pos.,Opp (FLEX format)  
            else if (fields.length >= 8 && fields[1] && fields[2]) {
                rank = parseInt(fields[1]);
                player = cleanPlayerName(fields[2]);
                opponent = cleanOpponent(fields[7] || fields[4]);
            }
            // Format C: Simple rank,player,opponent
            else if (fields.length >= 3) {
                rank = parseInt(fields[0] || fields[1]);
                player = cleanPlayerName(fields[1] || fields[2]);
                opponent = cleanOpponent(fields[2] || fields[3] || fields[fields.length - 1]);
            }
            
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
        .replace(/\r/g, '') // Remove carriage returns
        .trim();
}

function cleanOpponent(opponent) {
    if (!opponent) return '';
    
    // Extract opponent from various formats
    return opponent
        .replace(/!\[.*?\]\(.*?\)/g, '') // Remove markdown images
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\r/g, '') // Remove carriage returns
        .trim();
}

function guessPosition(playerName) {
    const rbKeywords = ['McCaffrey', 'Barkley', 'Henry', 'Cook', 'Kamara', 'Robinson', 'Gibbs', 'Walker', 'Jacobs'];
    const wrKeywords = ['Chase', 'Jefferson', 'Hill', 'Adams', 'Evans', 'Brown', 'Lamb', 'Kupp', 'Diggs'];
    const teKeywords = ['Kelce', 'Andrews', 'Kittle', 'Waller', 'Hockenson', 'LaPorta', 'Ertz'];
    
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
    
    return 'RB'; // Default to RB for FLEX
}