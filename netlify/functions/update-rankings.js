// Netlify serverless function to scrape rankings
const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    // Add CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS preflight request
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // For manual scraping (POST), require admin access
    if (event.httpMethod === 'POST') {
        const adminKey = process.env.ADMIN_SECRET_KEY;
        const providedKey = event.headers.authorization?.replace('Bearer ', '');
        
        if (!adminKey || providedKey !== adminKey) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Unauthorized - Admin access required for manual updates' 
                })
            };
        }
        console.log('Manual scraping triggered by admin');
    }

    // For GET requests, implement rate limiting
    if (event.httpMethod === 'GET') {
        // Only allow automated/scheduled calls or reasonable usage
        const userAgent = event.headers['user-agent'] || '';
        const isAutomated = userAgent.includes('Netlify') || userAgent.includes('cron') || context.clientContext;
        
        // If it's a manual user request, add some basic throttling
        if (!isAutomated) {
            console.log('Public API access - serving cached data if available');
            // We could implement more sophisticated rate limiting here
        }
    }

    try {
        // Load URLs from config.json instead of environment variables
        const fs = require('fs');
        const path = require('path');
        
        let config;
        try {
            // Try to read config.json from the function's directory
            const configPath = path.join(__dirname, '../../config.json');
            const configData = fs.readFileSync(configPath, 'utf8');
            config = JSON.parse(configData);
        } catch (configError) {
            console.error('Error reading config.json:', configError);
            // Fallback to environment variables if config.json not found
            config = {
                urls: {
                    QB: process.env.QB_URL,
                    RB: process.env.RB_URL,
                    WR: process.env.WR_URL,
                    TE: process.env.TE_URL,
                    FLEX: process.env.FLEX_URL,
                    DEF: process.env.DEF_URL,
                    K: process.env.K_URL
                }
            };
        }
        
        const urls = {
            qb: config.urls.QB,
            rb: config.urls.RB,
            wr: config.urls.WR,
            te: config.urls.TE,
            flex: config.urls.FLEX,
            def: config.urls.DEF,
            k: config.urls.K
        };
        
        console.log(`Using config - Week ${config.current_week || 'unknown'} (${config.season_year || '2025'})`);

        // Check if we need to update by comparing timestamps
        const shouldUpdate = await checkIfUpdateNeeded(urls.qb); // Use QB as reference
        
        if (!shouldUpdate.needsUpdate) {
            console.log('No update needed - timestamps unchanged');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'No update needed',
                    lastChecked: new Date().toISOString(),
                    articleTimestamp: shouldUpdate.currentTimestamp,
                    cached: true
                })
            };
        }

        console.log(`Update needed - timestamp changed to: ${shouldUpdate.currentTimestamp}`);
        
        const allRankings = {};
        let articleTimestamp = shouldUpdate.currentTimestamp;

        for (const [position, url] of Object.entries(urls)) {
            if (!url || url.includes('[ID]')) {
                console.log(`Skipping ${position} - no valid URL provided`);
                continue;
            }

            try {
                console.log(`Scraping ${position}: ${url}`);
                const result = await scrapeRankings(url, position);
                if (result && result.rankings && result.rankings.length > 0) {
                    allRankings[position] = result.rankings;
                    // Use the timestamp from the first article we scrape
                    if (result.articleTimestamp && !articleTimestamp) {
                        articleTimestamp = result.articleTimestamp;
                    }
                    console.log(`Found ${result.rankings.length} ${position.toUpperCase()} rankings`);
                }
            } catch (error) {
                console.error(`Error scraping ${position}:`, error);
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Store the new timestamp for future comparisons
        await storeLastTimestamp(articleTimestamp);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: allRankings,
                lastUpdated: new Date().toISOString(),
                articleTimestamp: articleTimestamp,
                positionsUpdated: Object.keys(allRankings)
            })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

async function checkIfUpdateNeeded(referenceUrl) {
    if (!referenceUrl) {
        return { needsUpdate: true, currentTimestamp: null };
    }

    try {
        const response = await fetch(referenceUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            console.log('Reference URL fetch failed, proceeding with update');
            return { needsUpdate: true, currentTimestamp: null };
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Extract timestamp from content-timestamp div
        const timestampElement = $('.content-timestamp time');
        const currentTimestamp = timestampElement.attr('datetime');
        
        if (!currentTimestamp) {
            console.log('No timestamp found, proceeding with update');
            return { needsUpdate: true, currentTimestamp: null };
        }

        // Get stored timestamp for comparison
        const lastKnownTimestamp = await getLastStoredTimestamp();
        
        const needsUpdate = !lastKnownTimestamp || currentTimestamp !== lastKnownTimestamp;
        
        console.log(`Timestamp check - Current: ${currentTimestamp}, Last: ${lastKnownTimestamp}, Needs update: ${needsUpdate}`);
        
        return { needsUpdate, currentTimestamp };
        
    } catch (error) {
        console.error('Error checking timestamp:', error);
        return { needsUpdate: true, currentTimestamp: null };
    }
}

async function getLastStoredTimestamp() {
    // In production, this would read from a database or persistent storage
    // For now, using environment variable or file-based storage
    try {
        const fs = require('fs').promises;
        const path = require('path');
        const timestampPath = path.join('/tmp', 'last_timestamp.txt');
        const timestamp = await fs.readFile(timestampPath, 'utf8');
        return timestamp.trim();
    } catch (error) {
        return null; // First time or file doesn't exist
    }
}

async function storeLastTimestamp(timestamp) {
    if (!timestamp) return;
    
    try {
        const fs = require('fs').promises;
        const path = require('path');
        const timestampPath = path.join('/tmp', 'last_timestamp.txt');
        await fs.writeFile(timestampPath, timestamp);
        console.log(`Stored timestamp: ${timestamp}`);
    } catch (error) {
        console.error('Error storing timestamp:', error);
    }
}

async function scrapeRankings(url, position) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const rankings = [];
        
        // Extract article timestamp
        const timestampElement = $('.content-timestamp time');
        const articleTimestamp = timestampElement.attr('datetime');

        // Try different extraction methods
        // Method 1: Look for ordered lists
        $('ol li').each((index, element) => {
            const text = $(element).text().trim();
            if (looksLikePlayerRanking(text)) {
                const player = parsePlayerText(text, index + 1);
                if (player) {
                    rankings.push({
                        preGameRank: index + 1,
                        player: player.name,
                        opponent: player.opponent
                    });
                }
            }
        });

        // Method 2: Look for numbered paragraphs if no OL found
        if (rankings.length === 0) {
            $('p').each((index, element) => {
                const text = $(element).text().trim();
                const rankMatch = text.match(/^(\d+)\.\s*(.+)/);
                if (rankMatch) {
                    const rank = parseInt(rankMatch[1]);
                    const playerText = rankMatch[2];
                    const player = parsePlayerText(playerText, rank);
                    if (player) {
                        rankings.push({
                            preGameRank: rank,
                            player: player.name,
                            opponent: player.opponent
                        });
                    }
                }
            });
        }

        return {
            rankings: rankings.slice(0, 20), // Limit to top 20
            articleTimestamp: articleTimestamp
        };
    } catch (error) {
        console.error(`Error scraping ${url}:`, error);
        return { rankings: [], articleTimestamp: null };
    }
}

function looksLikePlayerRanking(text) {
    return text.length > 5 && 
           (text.includes(' vs ') || text.includes(' @ ') || 
            /[A-Z][a-z]+ [A-Z][a-z]+/.test(text));
}

function parsePlayerText(text, rank) {
    try {
        // Remove rank number if present
        text = text.replace(/^\d+\.?\s*/, '');
        
        // Look for player name (usually at the start)
        const nameMatch = text.match(/^([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
        if (!nameMatch) return null;
            
        const name = nameMatch[1].trim();
        
        // Look for opponent information
        let opponent = '';
        const vsMatch = text.match(/(vs\.?\s*[A-Z]{2,3}|@\s*[A-Z]{2,3}|against\s*[A-Z]{2,3})/i);
        if (vsMatch) {
            opponent = vsMatch[1];
        }
        
        return { name, opponent };
    } catch {
        return null;
    }
}