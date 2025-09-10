// CSV-based scraper - Much faster and more reliable than Playwright
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
    console.log('🚀 Starting CSV-based Boone rankings scraper...');
    
    try {
        // Get configuration
        const config = await getConfig();
        
        if (!config.datawrapper_urls || Object.keys(config.datawrapper_urls).length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: 'No Datawrapper URLs configured'
                })
            };
        }
        
        // Scrape all positions using CSV endpoints
        console.log('📊 Scraping all positions from CSV endpoints...');
        const results = await scrapeAllPositionsCSV(config.datawrapper_urls);
        
        const totalPlayers = Object.values(results).reduce((sum, rankings) => sum + rankings.length, 0);
        
        if (totalPlayers === 0) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    error: 'No data retrieved from any position'
                })
            };
        }
        
        // Update rankings file
        console.log('💾 Updating rankings.json...');
        await updateRankingsFile(results);
        
        console.log('🎉 SUCCESS! All positions scraped via CSV');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                totalPlayers: totalPlayers,
                message: 'All positions successfully scraped via CSV!',
                breakdown: Object.entries(results).map(([pos, data]) => `${pos.toUpperCase()}: ${data.length}`).join(', ')
            })
        };
        
    } catch (error) {
        console.error('❌ Error in CSV scraper:', error);
        
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
    
    console.log('📋 Configuration loaded:');
    const totalUrls = Object.values(config.datawrapper_urls).reduce((sum, urls) => sum + urls.length, 0);
    console.log(`  Total Datawrapper URLs: ${totalUrls}`);
    
    return config;
}

async function scrapeAllPositionsCSV(datawrapperUrls) {
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

async function updateRankingsFile(results) {
    try {
        // Create backup
        const timestamp = Date.now();
        const backupPath = path.join(process.cwd(), `rankings.json.backup.${timestamp}`);
        
        try {
            const existingData = await fs.readFile(path.join(process.cwd(), 'rankings.json'), 'utf8');
            await fs.writeFile(backupPath, existingData);
            console.log(`📄 Backup created: rankings.json.backup.${timestamp}`);
        } catch (e) {
            console.log('📄 No existing file to backup');
        }
        
        // Add metadata to results
        const outputData = {
            ...results,
            lastUpdated: new Date().toISOString(),
            week: getCurrentWeekNumber(),
            scrapedAt: new Date().toISOString(),
            scrapingMethod: 'CSV'
        };
        
        // Write new rankings
        const rankingsPath = path.join(process.cwd(), 'rankings.json');
        const formattedResults = JSON.stringify(outputData, null, 2);
        await fs.writeFile(rankingsPath, formattedResults);
        
        console.log('✅ rankings.json updated successfully');
        
        // Log summary
        const summary = Object.entries(results).map(([position, rankings]) => 
            `${position.toUpperCase()}: ${rankings.length}`
        ).join(', ');
        console.log(`📊 Updated rankings: ${summary}`);
        
    } catch (error) {
        console.error('❌ Error updating rankings file:', error);
        throw error;
    }
}

function getCurrentWeekNumber() {
    // Calculate current NFL week based on season start
    const seasonStart = new Date('2025-09-05'); // Adjust for actual season start
    const now = new Date();
    const weeksDiff = Math.floor((now - seasonStart) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(18, weeksDiff + 1));
}