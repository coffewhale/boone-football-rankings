// HTTP-callable version with JSON file timestamp storage
const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    console.log('🔧 Manual timestamp-based updater (JSON version) starting...');
    
    try {
        // Check environment variables
        const monitorUrl = process.env.MONITOR_URL;
        const githubToken = process.env.GITHUB_TOKEN;
        const repo = process.env.GITHUB_REPO || 'coffewhale/boone-football-rankings';
        
        console.log('🔍 Environment check:');
        console.log(`  MONITOR_URL: ${monitorUrl ? 'exists' : 'missing'}`);
        console.log(`  GITHUB_TOKEN: ${githubToken ? 'exists' : 'missing'}`);
        
        if (!monitorUrl) {
            throw new Error('MONITOR_URL environment variable is required');
        }
        if (!githubToken) {
            throw new Error('GITHUB_TOKEN environment variable is required');
        }
        
        // Step 1: Check timestamp using JSON file
        const timestampResult = await checkTimestamp(githubToken, repo);
        
        if (!timestampResult.updateNeeded) {
            console.log('✅ No update needed - timestamps match');
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    updateNeeded: false,
                    message: 'No update needed - timestamps match',
                    timestamps: timestampResult
                })
            };
        }
        
        console.log('🚨 Timestamp changed! Getting fresh data...');
        
        // Step 2: Get fresh data
        const freshData = await getFreshData();
        
        // Step 3: Commit both rankings.json AND timestamp.json to GitHub
        console.log('📝 Committing rankings + timestamp to GitHub...');
        const commitResult = await commitBothFiles(freshData, timestampResult, githubToken, repo);
        
        console.log('🎉 SUCCESS! Rankings + timestamp updated');
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                updateNeeded: true,
                message: 'Rankings updated successfully!',
                totalPlayers: freshData.totalPlayers,
                timestamps: timestampResult,
                commit: commitResult,
                note: 'Timestamp automatically updated in timestamp.json'
            })
        };
        
    } catch (error) {
        console.error('❌ Error in JSON manual updater:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};

async function checkTimestamp(githubToken, repo) {
    console.log(`🔍 Checking timestamp from JSON file and Yahoo...`);
    
    // Step 1: Get stored timestamp from JSON file
    let storedTimestamp = null;
    try {
        const timestampResponse = await fetch(`https://api.github.com/repos/${repo}/contents/timestamp.json`, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'User-Agent': 'Boone-Rankings-Bot'
            }
        });
        
        if (timestampResponse.ok) {
            const timestampFile = await timestampResponse.json();
            const timestampData = JSON.parse(Buffer.from(timestampFile.content, 'base64').toString());
            storedTimestamp = timestampData.lastStoredTimestamp;
            console.log(`📄 Stored timestamp from JSON: ${storedTimestamp}`);
        } else {
            console.log('📄 No timestamp.json found, treating as first run');
        }
    } catch (e) {
        console.log('📄 Could not read timestamp.json, treating as first run');
    }
    
    // Step 2: Get current timestamp from Yahoo
    const monitorUrl = process.env.MONITOR_URL;
    const response = await fetch(monitorUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Boone-Rankings-Bot)' },
        timeout: 15000
    });
    
    if (!response.ok) {
        throw new Error(`Yahoo fetch failed: HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
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
    
    const updateNeeded = !storedTimestamp || currentTimestamp !== storedTimestamp;
    
    console.log(`📊 Timestamp check:`);
    console.log(`  Current: ${currentTimestamp}`);
    console.log(`  Stored:  ${storedTimestamp || 'None'}`);
    console.log(`  Update needed: ${updateNeeded}`);
    
    return {
        current: currentTimestamp,
        stored: storedTimestamp,
        updateNeeded: updateNeeded
    };
}

async function getFreshData() {
    console.log('📊 Fetching fresh data from scrape-and-serve...');
    
    // For local testing, use localhost; for production, use the live URL
    const isLocal = process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true';
    const baseUrl = isLocal ? 'http://localhost:8888' : 'https://boone-football-rankings.netlify.app';
    const dataUrl = `${baseUrl}/.netlify/functions/scrape-and-serve`;
    
    console.log(`🌐 Using data URL: ${dataUrl}`);
    
    const response = await fetch(dataUrl, {
        headers: { 'User-Agent': 'Internal-Timestamp-Bot' },
        timeout: 120000 // 2 minutes for scraping
    });
    
    if (!response.ok) {
        throw new Error(`Scraper fetch failed: HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const totalPlayers = data.totalPlayers || 0;
    
    if (totalPlayers === 0) {
        throw new Error('No player data received from scraper');
    }
    
    console.log(`✅ Fresh data retrieved: ${totalPlayers} players`);
    
    // Add timestamp-triggered metadata
    data.scrapingMethod = 'JSON-Timestamp-Triggered';
    data.triggeredAt = new Date().toISOString();
    
    return data;
}

async function commitBothFiles(rankingsData, timestampResult, githubToken, repo) {
    console.log('🔑 Committing both rankings.json and timestamp.json...');
    
    // Update the rankings data with the new timestamp
    rankingsData.lastUpdated = timestampResult.current;
    
    // Get current SHAs for both files
    const [rankingsSha, timestampSha] = await Promise.all([
        getFileSha(repo, 'rankings.json', githubToken),
        getFileSha(repo, 'timestamp.json', githubToken)
    ]);
    
    // Prepare new timestamp.json content
    const newTimestampData = {
        lastStoredTimestamp: timestampResult.current,
        lastUpdated: new Date().toISOString(),
        source: "Yahoo Sports - Justin Boone Rankings",
        week: rankingsData.week || 2
    };
    
    // Prepare commit contents
    const rankingsContent = JSON.stringify(rankingsData, null, 2);
    const timestampContent = JSON.stringify(newTimestampData, null, 2);
    
    const commitMessage = `Auto-update Week ${rankingsData.week || '?'} rankings + timestamp

🤖 Triggered by Yahoo timestamp change
📅 New timestamp: ${timestampResult.current}
⚡ Method: ${rankingsData.scrapingMethod}
📊 Total players: ${rankingsData.totalPlayers}

Player counts:
${Object.entries(rankingsData).filter(([k, v]) => Array.isArray(v) && v.length > 0).map(([pos, players]) => `- ${pos.toUpperCase()}: ${players.length}`).join('\n')}`;

    // Update rankings.json
    const rankingsUpdate = await fetch(`https://api.github.com/repos/${repo}/contents/rankings.json`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${githubToken}`,
            'User-Agent': 'Boone-Rankings-Bot',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: commitMessage,
            content: Buffer.from(rankingsContent).toString('base64'),
            ...(rankingsSha && { sha: rankingsSha })
        })
    });
    
    if (!rankingsUpdate.ok) {
        const errorData = await rankingsUpdate.text();
        throw new Error(`Rankings commit failed: ${rankingsUpdate.status} - ${errorData}`);
    }
    
    // Update timestamp.json
    const timestampUpdate = await fetch(`https://api.github.com/repos/${repo}/contents/timestamp.json`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${githubToken}`,
            'User-Agent': 'Boone-Rankings-Bot',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: `Update timestamp: ${timestampResult.current}`,
            content: Buffer.from(timestampContent).toString('base64'),
            ...(timestampSha && { sha: timestampSha })
        })
    });
    
    if (!timestampUpdate.ok) {
        const errorData = await timestampUpdate.text();
        throw new Error(`Timestamp commit failed: ${timestampUpdate.status} - ${errorData}`);
    }
    
    const rankingsResult = await rankingsUpdate.json();
    const timestampCommitResult = await timestampUpdate.json();
    
    console.log('✅ Both files committed successfully');
    console.log(`🔗 Rankings: ${rankingsResult.commit.html_url}`);
    console.log(`🔗 Timestamp: ${timestampCommitResult.commit.html_url}`);
    
    return {
        rankingsCommitSha: rankingsResult.commit.sha,
        timestampCommitSha: timestampCommitResult.commit.sha,
        rankingsCommitUrl: rankingsResult.commit.html_url,
        timestampCommitUrl: timestampCommitResult.commit.html_url
    };
}

async function getFileSha(repo, filename, githubToken) {
    try {
        const response = await fetch(`https://api.github.com/repos/${repo}/contents/${filename}`, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'User-Agent': 'Boone-Rankings-Bot'
            }
        });
        
        if (response.ok) {
            const fileData = await response.json();
            return fileData.sha;
        }
    } catch (e) {
        console.log(`📄 No existing ${filename}, creating new`);
    }
    return null;
}