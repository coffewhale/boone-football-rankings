// Simple timestamp-based updater that uses the working scrape-and-serve logic
const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    console.log('⏰ Timestamp-based updater starting...');
    
    try {
        // Step 1: Check if update is needed based on timestamp
        const timestampCheck = await checkTimestampChange();
        
        if (!timestampCheck.updateNeeded) {
            console.log('✅ No update needed - timestamps match');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    updateNeeded: false,
                    message: 'No update needed - timestamps match',
                    currentTimestamp: timestampCheck.currentTimestamp,
                    lastStoredTimestamp: timestampCheck.lastStoredTimestamp
                })
            };
        }
        
        console.log('🚨 Timestamp changed! Fetching fresh data...');
        
        // Step 2: Get fresh data from our working scrape-and-serve endpoint
        const dataResponse = await fetch('https://boone-football-rankings.netlify.app/.netlify/functions/scrape-and-serve', {
            headers: {
                'User-Agent': 'Internal-Update-Bot'
            }
        });
        
        if (!dataResponse.ok) {
            throw new Error(`Failed to fetch fresh data: HTTP ${dataResponse.status}`);
        }
        
        const freshData = await dataResponse.json();
        const totalPlayers = freshData.totalPlayers || 0;
        
        if (totalPlayers === 0) {
            throw new Error('No player data received from scraper');
        }
        
        console.log(`📊 Fresh data retrieved: ${totalPlayers} players`);
        
        // Step 3: Update data with new timestamp
        freshData.lastUpdated = timestampCheck.currentTimestamp;
        freshData.scrapingMethod = 'Timestamp-Triggered';
        freshData.triggeredAt = new Date().toISOString();
        
        // Step 4: Commit to GitHub
        console.log('📝 Committing to GitHub...');
        const commitResult = await commitToGitHub(freshData);
        
        console.log('🎉 SUCCESS! Rankings updated via timestamp trigger');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                updateNeeded: true,
                message: 'Rankings updated via timestamp trigger!',
                totalPlayers: totalPlayers,
                timestampChange: timestampCheck,
                commitInfo: commitResult,
                manualStep: `Update LAST_STORED_TIMESTAMP to: ${timestampCheck.currentTimestamp}`
            })
        };
        
    } catch (error) {
        console.error('❌ Error in timestamp updater:', error);
        
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

async function checkTimestampChange() {
    const monitorUrl = process.env.MONITOR_URL;
    const lastStoredTimestamp = process.env.LAST_STORED_TIMESTAMP;
    
    if (!monitorUrl) {
        throw new Error('MONITOR_URL environment variable not configured');
    }
    
    console.log(`🔍 Checking timestamp at: ${monitorUrl}`);
    
    const response = await fetch(monitorUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Boone-Rankings-Bot)'
        },
        timeout: 15000
    });
    
    if (!response.ok) {
        throw new Error(`Yahoo article request failed: HTTP ${response.status}`);
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
        throw new Error('No timestamp found on Yahoo article page');
    }
    
    const updateNeeded = !lastStoredTimestamp || currentTimestamp !== lastStoredTimestamp;
    
    console.log(`📊 Timestamp comparison:`);
    console.log(`    Current: ${currentTimestamp}`);
    console.log(`    Stored:  ${lastStoredTimestamp || 'None'}`);
    console.log(`    Update needed: ${updateNeeded}`);
    
    return {
        updateNeeded,
        currentTimestamp,
        lastStoredTimestamp
    };
}

async function commitToGitHub(data) {
    const githubToken = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO || 'coffewhale/boone-football-rankings';
    
    if (!githubToken) {
        throw new Error('GITHUB_TOKEN environment variable not configured');
    }
    
    console.log('🔑 Using GitHub API to update rankings.json...');
    
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
            console.log('📄 Found existing rankings.json');
        }
    } catch (e) {
        console.log('📄 No existing rankings.json, will create new');
    }
    
    // Prepare commit
    const content = JSON.stringify(data, null, 2);
    const encodedContent = Buffer.from(content).toString('base64');
    
    const commitMessage = `Auto-update Week ${data.week || '?'} rankings - ${data.totalPlayers} players

🤖 Triggered by Yahoo timestamp change: ${data.lastUpdated}
⚡ ${data.scrapingMethod} at ${data.triggeredAt}

Rankings include:
${Object.entries(data).filter(([k, v]) => Array.isArray(v) && v.length > 0).map(([pos, players]) => `- ${pos.toUpperCase()}: ${players.length} players`).join('\n')}`;
    
    // Create/update file
    const updateResponse = await fetch(`https://api.github.com/repos/${repo}/contents/rankings.json`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${githubToken}`,
            'User-Agent': 'Boone-Rankings-Bot',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: commitMessage,
            content: encodedContent,
            ...(sha && { sha })
        })
    });
    
    if (!updateResponse.ok) {
        const errorData = await updateResponse.text();
        throw new Error(`GitHub commit failed: ${updateResponse.status} - ${errorData}`);
    }
    
    const result = await updateResponse.json();
    
    console.log('✅ GitHub commit successful');
    console.log(`🔗 ${result.commit.html_url}`);
    
    return {
        commitSha: result.commit.sha,
        commitUrl: result.commit.html_url,
        message: 'rankings.json updated successfully'
    };
}