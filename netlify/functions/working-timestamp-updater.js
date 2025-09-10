// Complete working timestamp-based updater
const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    console.log('⏰ Working timestamp-based updater starting...');
    
    try {
        // Step 1: Check timestamp (we know this works)
        const timestampResult = await checkTimestamp();
        
        if (!timestampResult.updateNeeded) {
            console.log('✅ No update needed - timestamps match');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    updateNeeded: false,
                    message: 'No update needed - timestamps match',
                    timestamps: timestampResult
                })
            };
        }
        
        console.log('🚨 Timestamp changed! Getting fresh data...');
        
        // Step 2: Get fresh data from working scrape-and-serve endpoint
        const freshData = await getFreshData();
        
        // Step 3: Commit to GitHub
        console.log('📝 Committing to GitHub...');
        const commitResult = await commitToGitHub(freshData, timestampResult.current);
        
        console.log('🎉 SUCCESS! Rankings updated via timestamp change');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                updateNeeded: true,
                message: 'Rankings updated successfully!',
                totalPlayers: freshData.totalPlayers,
                timestamps: timestampResult,
                commit: commitResult,
                manualStep: `Update LAST_STORED_TIMESTAMP to: ${timestampResult.current}`
            })
        };
        
    } catch (error) {
        console.error('❌ Error in working updater:', error);
        
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

async function checkTimestamp() {
    const monitorUrl = process.env.MONITOR_URL;
    const lastTimestamp = process.env.LAST_STORED_TIMESTAMP;
    
    console.log(`🔍 Checking timestamp at Yahoo...`);
    
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
    
    const updateNeeded = !lastTimestamp || currentTimestamp !== lastTimestamp;
    
    console.log(`📊 Timestamp check:`);
    console.log(`  Current: ${currentTimestamp}`);
    console.log(`  Stored:  ${lastTimestamp || 'None'}`);
    console.log(`  Update needed: ${updateNeeded}`);
    
    return {
        current: currentTimestamp,
        stored: lastTimestamp,
        updateNeeded: updateNeeded
    };
}

async function getFreshData() {
    console.log('📊 Fetching fresh data from scrape-and-serve...');
    
    // Use full URL to avoid any routing issues
    const dataUrl = 'https://boone-football-rankings.netlify.app/.netlify/functions/scrape-and-serve';
    
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
    data.scrapingMethod = 'Timestamp-Triggered';
    data.triggeredAt = new Date().toISOString();
    
    return data;
}

async function commitToGitHub(data, newTimestamp) {
    const githubToken = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO || 'coffewhale/boone-football-rankings';
    
    console.log('🔑 Committing to GitHub...');
    
    // Update the lastUpdated with the new timestamp
    data.lastUpdated = newTimestamp;
    
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
            const fileData = await getCurrentFile.json();
            sha = fileData.sha;
        }
    } catch (e) {
        console.log('📄 No existing file, creating new');
    }
    
    // Create commit
    const content = JSON.stringify(data, null, 2);
    const encodedContent = Buffer.from(content).toString('base64');
    
    const commitMessage = `Auto-update Week ${data.week || '?'} rankings - ${data.totalPlayers} players

🤖 Triggered by Yahoo timestamp change
📅 New timestamp: ${newTimestamp}
⚡ Method: ${data.scrapingMethod}

Player counts:
${Object.entries(data).filter(([k, v]) => Array.isArray(v) && v.length > 0).map(([pos, players]) => `- ${pos.toUpperCase()}: ${players.length}`).join('\n')}`;
    
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
        commitUrl: result.commit.html_url
    };
}