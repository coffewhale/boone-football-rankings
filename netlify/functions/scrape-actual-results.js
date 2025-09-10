// Manual trigger to scrape FantasyPros actual results for week-to-week analysis
const { chromium } = require('playwright-chromium');

// Helper function to parse CSV data
function parseCSVData(csvText, position) {
    const lines = csvText.split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const players = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length < 2) continue;
        
        // Find player name and fantasy points columns
        const playerName = values[0] || values.find(v => v.includes(' ')) || '';
        const fantasyPoints = parseFloat(values[values.length - 1]) || 0;
        
        if (playerName) {
            players.push({
                rank: i,
                name: playerName.replace(/[^\w\s]/g, '').trim(),
                team: '',
                fantasyPoints: fantasyPoints,
                position: position
            });
        }
    }
    
    return players;
}

exports.handler = async (event, context) => {
    console.log('🏈 Starting FantasyPros actual results scraper...');
    
    // Accept week parameter from query string, default to current week
    const week = event.queryStringParameters?.week || '1';
    
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        
        // Set headers to avoid being blocked
        await page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        });
        
        const results = {};
        
        // Position mappings for FantasyPros URLs
        const positions = {
            'QB': 'qb',
            'RB': 'rb', 
            'WR': 'wr',
            'TE': 'te',
            'K': 'k',
            'DEF': 'dst'
        };
        
        for (const [position, urlPosition] of Object.entries(positions)) {
            console.log(`📊 Scraping ${position} results...`);
            
            const url = `https://www.fantasypros.com/nfl/reports/leaders/${urlPosition}.php?year=2025&start=${week}&end=${week}`;
            
            try {
                await page.goto(url, { 
                    waitUntil: 'networkidle',
                    timeout: 30000 
                });
                
                // First try to find and use CSV export if available
                let csvUrl = null;
                try {
                    const csvLink = await page.$('a[href*="export"], a[href*="csv"], button[data-export="csv"]');
                    if (csvLink) {
                        csvUrl = await csvLink.getAttribute('href');
                        console.log(`🔍 Found CSV export for ${position}`);
                    }
                } catch (e) {
                    console.log(`📋 No CSV export found for ${position}, using HTML scraping`);
                }
                
                let playerData = [];
                
                if (csvUrl) {
                    // Use CSV export
                    try {
                        const csvResponse = await page.goto(csvUrl);
                        const csvText = await csvResponse.text();
                        playerData = parseCSVData(csvText, position);
                    } catch (csvError) {
                        console.log(`❌ CSV export failed for ${position}, falling back to HTML`);
                        csvUrl = null;
                    }
                }
                
                if (!csvUrl) {
                    // Fall back to HTML scraping
                    await page.waitForSelector('#data', { timeout: 10000 });
                    
                    playerData = await page.evaluate(() => {
                        const rows = document.querySelectorAll('#data tbody tr');
                        const players = [];
                        
                        rows.forEach((row, index) => {
                            const cells = row.querySelectorAll('td');
                            if (cells.length >= 2) {
                                const playerLink = cells[1].querySelector('a');
                                if (playerLink) {
                                    const playerName = playerLink.textContent.trim();
                                    const team = cells[1].querySelector('small')?.textContent.trim() || '';
                                    
                                    // Get fantasy points (usually the last meaningful column)
                                    let fantasyPoints = 0;
                                    const pointsCell = cells[cells.length - 1];
                                    if (pointsCell) {
                                        const points = parseFloat(pointsCell.textContent.trim());
                                        if (!isNaN(points)) {
                                            fantasyPoints = points;
                                        }
                                    }
                                    
                                    players.push({
                                        rank: index + 1,
                                        name: playerName,
                                        team: team,
                                        fantasyPoints: fantasyPoints,
                                        position: position
                                    });
                                }
                            }
                        });
                        
                        return players;
                    });
                }
                
                results[position] = playerData;
                console.log(`✅ ${position}: Found ${playerData.length} players`);
                
                // Small delay between requests
                await page.waitForTimeout(1000);
                
            } catch (positionError) {
                console.error(`❌ Error scraping ${position}:`, positionError.message);
                results[position] = [];
            }
        }
        
        // Create timestamped results object
        const finalResults = {
            week: parseInt(week),
            scraped_at: new Date().toISOString(),
            source: 'fantasypros',
            data: results
        };
        
        console.log('✅ Scraping complete');
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                message: `Successfully scraped week ${week} actual results`,
                results: finalResults,
                summary: Object.entries(results).map(([pos, players]) => 
                    `${pos}: ${players.length} players`
                ).join(', ')
            })
        };
        
    } catch (error) {
        console.error('❌ Scraping error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: error.message,
                message: 'Failed to scrape actual results'
            })
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};