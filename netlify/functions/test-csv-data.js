// Test CSV data retrieval without file writing
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    console.log('🧪 Testing CSV data retrieval...');
    
    try {
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
        
        const results = {};
        const sample = {};
        
        for (const [position, urls] of Object.entries(config.datawrapper_urls)) {
            if (!urls || urls.length === 0) {
                results[position] = [];
                continue;
            }
            
            console.log(`🔍 Testing ${position.toUpperCase()} CSV...`);
            const rankings = await testPositionCSV(position, urls);
            results[position] = rankings;
            sample[position] = rankings.slice(0, 3); // First 3 for sample
        }
        
        const totalPlayers = Object.values(results).reduce((sum, rankings) => sum + rankings.length, 0);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                totalPlayers: totalPlayers,
                breakdown: Object.entries(results).map(([pos, data]) => `${pos.toUpperCase()}: ${data.length}`).join(', '),
                sampleData: sample
            }, null, 2)
        };
        
    } catch (error) {
        console.error('❌ Error in CSV test:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

async function testPositionCSV(position, urls) {
    for (const url of urls) {
        try {
            const csvUrl = convertToCSVEndpoint(url);
            console.log(`  Testing: ${csvUrl}`);
            
            const response = await fetch(csvUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                },
                timeout: 15000
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const csvText = await response.text();
            const rankings = parseCSVData(csvText, position);
            
            if (rankings.length > 0) {
                console.log(`    ✅ ${rankings.length} players`);
                return rankings;
            }
            
        } catch (error) {
            console.log(`    ❌ Error: ${error.message}`);
        }
    }
    
    return [];
}

function convertToCSVEndpoint(datawrapperUrl) {
    if (datawrapperUrl.includes('datawrapper.dwcdn.net')) {
        const match = datawrapperUrl.match(/datawrapper\.dwcdn\.net\/([^\/]+)/);
        if (match) {
            return `https://datawrapper.dwcdn.net/${match[1]}/1/dataset.csv`;
        }
    }
    
    if (datawrapperUrl.includes('www.datawrapper.de/_/')) {
        const match = datawrapperUrl.match(/www\.datawrapper\.de\/_\/([^\/]+)/);
        if (match) {
            return `https://datawrapper.dwcdn.net/${match[1]}/1/dataset.csv`;
        }
    }
    
    const chartIdMatch = datawrapperUrl.match(/([a-zA-Z0-9]{5,})/);
    if (chartIdMatch) {
        return `https://datawrapper.dwcdn.net/${chartIdMatch[1]}/1/dataset.csv`;
    }
    
    throw new Error(`Cannot convert URL: ${datawrapperUrl}`);
}

function parseCSVData(csvText, position) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const rankings = [];
    
    for (let i = 1; i < lines.length; i++) {
        try {
            const line = lines[i];
            if (!line.trim()) continue;
            
            const fields = parseCSVLine(line);
            if (fields.length < 5) continue;
            
            const rank = parseInt(fields[2]);
            const player = cleanPlayerName(fields[3]);
            const opponent = cleanOpponent(fields[5] || fields[4]);
            
            if (!rank || !player || rank < 1 || rank > 100) continue;
            
            const rankingData = {
                preGameRank: rank,
                player: player,
                opponent: opponent
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

function cleanPlayerName(player) {
    if (!player) return '';
    return player
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/<[^>]*>/g, '')
        .trim();
}

function cleanOpponent(opponent) {
    if (!opponent) return '';
    return opponent
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/<[^>]*>/g, '')
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