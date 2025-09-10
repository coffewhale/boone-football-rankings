// Simplified version to test the scraping and GitHub commit flow
const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    console.log('🧪 Testing simplified scraper flow...');
    
    try {
        // Step 1: Test timestamp check
        console.log('⏰ Step 1: Checking timestamp...');
        const monitorUrl = process.env.MONITOR_URL;
        const lastTimestamp = process.env.LAST_STORED_TIMESTAMP;
        
        if (!monitorUrl) {
            throw new Error('MONITOR_URL not configured');
        }
        
        const response = await fetch(monitorUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Boone-Rankings-Bot)'
            },
            timeout: 15000
        });
        
        if (!response.ok) {
            throw new Error(`Yahoo fetch failed: HTTP ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Look for timestamp
        let currentTimestamp = null;
        const selectors = ['.content-timestamp time', 'time[datetime]', '[data-timestamp]'];
        
        for (const selector of selectors) {
            const element = $(selector);
            if (element.length > 0) {
                currentTimestamp = element.attr('datetime') || element.attr('data-timestamp');
                if (currentTimestamp) break;
            }
        }
        
        if (!currentTimestamp) {
            throw new Error('No timestamp found on Yahoo page');
        }
        
        const updateNeeded = !lastTimestamp || currentTimestamp !== lastTimestamp;
        
        console.log(`📊 Timestamp check:`);
        console.log(`  Current: ${currentTimestamp}`);
        console.log(`  Stored:  ${lastTimestamp || 'None'}`);
        console.log(`  Update needed: ${updateNeeded}`);
        
        if (!updateNeeded) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    updateNeeded: false,
                    message: 'No update needed - timestamps match',
                    currentTimestamp,
                    lastTimestamp
                })
            };
        }
        
        // Step 2: Test simple CSV scraping (just QB)
        console.log('📊 Step 2: Testing CSV scraping...');
        const qbUrls = (process.env.QB_URLS || "").split(',').filter(url => url.trim());
        
        if (qbUrls.length === 0) {
            throw new Error('No QB_URLS configured');
        }
        
        const csvUrl = await convertToCSVUrl(qbUrls[0]);
        console.log(`Testing CSV: ${csvUrl}`);
        
        const csvResponse = await fetch(csvUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
        });
        
        if (!csvResponse.ok) {
            throw new Error(`CSV fetch failed: HTTP ${csvResponse.status}`);
        }
        
        const csvText = await csvResponse.text();
        const qbRankings = parseSimpleCSV(csvText);
        
        console.log(`✅ Scraped ${qbRankings.length} QB players`);
        
        // Step 3: Test GitHub commit with simple data
        console.log('📝 Step 3: Testing GitHub commit...');
        const testData = {
            qb: qbRankings,
            rb: [],
            wr: [],
            te: [],
            flex: [],
            def: [],
            k: [],
            lastUpdated: currentTimestamp,
            week: getCurrentWeekNumber(),
            scrapedAt: new Date().toISOString(),
            scrapingMethod: 'Simple-Test',
            totalPlayers: qbRankings.length
        };
        
        const commitResult = await commitToGitHub(testData);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                updateNeeded: true,
                message: 'Test successful! GitHub commit created.',
                timestampCheck: { currentTimestamp, lastTimestamp, updateNeeded },
                scrapingTest: { qbPlayers: qbRankings.length },
                commitResult: commitResult
            }, null, 2)
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message,
                stack: error.stack
            }, null, 2)
        };
    }
};

async function convertToCSVUrl(datawrapperUrl) {
    let chartId = null;
    
    const urlMatch = datawrapperUrl.match(/\/([a-zA-Z0-9]{5,})\/?\??/);
    if (urlMatch) {
        chartId = urlMatch[1];
    }
    
    if (!chartId) {
        const response = await fetch(datawrapperUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
        });
        
        if (response.ok) {
            const html = await response.text();
            const patterns = [
                /"chartId":\s*"([a-zA-Z0-9]{5,})"/,
                /"id":\s*"([a-zA-Z0-9]{5,})"/
            ];
            
            for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match) {
                    chartId = match[1];
                    break;
                }
            }
        }
    }
    
    if (!chartId) {
        throw new Error('Could not extract chart ID');
    }
    
    return `https://datawrapper.dwcdn.net/${chartId}/1/dataset.csv`;
}

function parseSimpleCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const rankings = [];
    
    for (let i = 1; i < lines.length && i < 11; i++) { // Just first 10 for testing
        const fields = lines[i].split(',');
        if (fields.length >= 5) {
            const rank = parseInt(fields[2]);
            const player = fields[3]?.replace(/"/g, '').trim();
            const opponent = fields[5]?.replace(/"/g, '').trim();
            
            if (rank && player) {
                rankings.push({
                    preGameRank: rank,
                    player: player,
                    opponent: opponent || 'TBD'
                });
            }
        }
    }
    
    return rankings.sort((a, b) => a.preGameRank - b.preGameRank);
}

async function commitToGitHub(data) {
    const githubToken = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO || 'coffewhale/boone-football-rankings';
    
    if (!githubToken) {
        throw new Error('GITHUB_TOKEN not configured');
    }
    
    // Get current file SHA
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
        console.log('No existing file, will create new');
    }
    
    // Create commit
    const content = JSON.stringify(data, null, 2);
    const encodedContent = Buffer.from(content).toString('base64');
    
    const updateResponse = await fetch(`https://api.github.com/repos/${repo}/contents/rankings.json`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${githubToken}`,
            'User-Agent': 'Boone-Rankings-Bot',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: `Test update: ${data.totalPlayers} players (${data.scrapingMethod})`,
            content: encodedContent,
            ...(sha && { sha })
        })
    });
    
    if (!updateResponse.ok) {
        const errorData = await updateResponse.text();
        throw new Error(`GitHub commit failed: ${updateResponse.status} - ${errorData}`);
    }
    
    const result = await updateResponse.json();
    return {
        commitSha: result.commit.sha,
        commitUrl: result.commit.html_url
    };
}

function getCurrentWeekNumber() {
    const seasonStart = new Date('2025-09-05');
    const now = new Date();
    const weeksDiff = Math.floor((now - seasonStart) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(18, weeksDiff + 1));
}