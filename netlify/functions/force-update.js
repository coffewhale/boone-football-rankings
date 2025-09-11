// Force update rankings regardless of timestamp
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    console.log('🔧 FORCE UPDATE: Bypassing timestamp check...');
    
    try {
        const githubToken = process.env.GITHUB_TOKEN;
        const repo = process.env.GITHUB_REPO || 'coffewhale/boone-football-rankings';
        
        if (!githubToken) {
            throw new Error('GITHUB_TOKEN environment variable is required');
        }
        
        console.log('🚨 FORCING fresh data scrape...');
        
        // Get fresh data from scraper
        const freshData = await getFreshData();
        
        // Get current timestamp from GitHub
        let currentTimestamp = freshData.lastUpdated || new Date().toISOString();
        
        // Commit both files
        console.log('📝 Committing forced update to GitHub...');
        const commitResult = await commitBothFiles(freshData, currentTimestamp, githubToken, repo);
        
        console.log('🎉 SUCCESS! Force update complete');
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                message: 'Rankings force updated successfully!',
                totalPlayers: freshData.totalPlayers,
                timestamp: currentTimestamp,
                commit: commitResult
            })
        };
        
    } catch (error) {
        console.error('❌ Error in force update:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

async function getFreshData() {
    console.log('📊 Fetching fresh data from scrape-and-serve...');
    
    const isLocal = process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true';
    const baseUrl = isLocal ? 'http://localhost:8888' : 'https://boone-football-rankings.netlify.app';
    const dataUrl = `${baseUrl}/.netlify/functions/scrape-and-serve`;
    
    console.log(`🌐 Using data URL: ${dataUrl}`);
    
    const response = await fetch(dataUrl, {
        headers: { 'User-Agent': 'Internal-Force-Update-Bot' },
        timeout: 120000
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
    
    data.scrapingMethod = 'Force-Update';
    data.forcedAt = new Date().toISOString();
    
    return data;
}

async function getFileSha(repo, path, githubToken) {
    try {
        const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'User-Agent': 'Boone-Rankings-Bot'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.sha;
        }
    } catch (e) {
        // File doesn't exist
    }
    return null;
}

async function commitBothFiles(rankingsData, timestamp, githubToken, repo) {
    console.log('🔑 Committing both rankings.json and timestamp.json...');
    
    // Get current SHAs for both files RIGHT BEFORE committing
    // This ensures we have the latest version even if another process just updated
    const [rankingsSha, timestampSha] = await Promise.all([
        getFileSha(repo, 'rankings.json', githubToken),
        getFileSha(repo, 'timestamp.json', githubToken)
    ]);
    
    console.log(`📄 Current SHAs - rankings: ${rankingsSha?.substring(0,7)}, timestamp: ${timestampSha?.substring(0,7)}`);
    
    // Prepare new timestamp.json content
    const newTimestampData = {
        lastStoredTimestamp: timestamp,
        lastUpdated: new Date().toISOString(),
        source: "Yahoo Sports - Justin Boone Rankings",
        week: rankingsData.week || 2
    };
    
    // Commit rankings.json with retry logic
    const rankingsContent = JSON.stringify(rankingsData, null, 2);
    let rankingsResponse;
    let retries = 0;
    const maxRetries = 2;
    
    while (retries <= maxRetries) {
        // Get fresh SHA if retrying
        const currentRankingsSha = retries > 0 ? await getFileSha(repo, 'rankings.json', githubToken) : rankingsSha;
        
        rankingsResponse = await fetch(`https://api.github.com/repos/${repo}/contents/rankings.json`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'User-Agent': 'Boone-Rankings-Bot',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Force update: ${rankingsData.totalPlayers} players - Week ${rankingsData.week || '?'}`,
                content: Buffer.from(rankingsContent).toString('base64'),
                ...(currentRankingsSha && { sha: currentRankingsSha })
            })
        });
        
        if (rankingsResponse.ok) {
            break;
        }
        
        if (rankingsResponse.status === 409 || rankingsResponse.status === 422) {
            console.log(`⚠️ Conflict detected, retrying with fresh SHA (attempt ${retries + 1}/${maxRetries})...`);
            retries++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        } else {
            throw new Error(`Failed to commit rankings.json: ${rankingsResponse.status}`);
        }
    }
    
    if (!rankingsResponse.ok) {
        throw new Error(`Failed to commit rankings.json after ${maxRetries} retries`);
    }
    
    // Commit timestamp.json
    const timestampContent = JSON.stringify(newTimestampData, null, 2);
    const timestampResponse = await fetch(`https://api.github.com/repos/${repo}/contents/timestamp.json`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${githubToken}`,
            'User-Agent': 'Boone-Rankings-Bot',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: `Update timestamp for force update`,
            content: Buffer.from(timestampContent).toString('base64'),
            ...(timestampSha && { sha: timestampSha })
        })
    });
    
    if (!timestampResponse.ok) {
        throw new Error(`Failed to commit timestamp.json: ${timestampResponse.status}`);
    }
    
    const result = await rankingsResponse.json();
    
    console.log('✅ Both files committed successfully');
    
    return {
        commitSha: result.commit.sha,
        commitUrl: result.commit.html_url
    };
}