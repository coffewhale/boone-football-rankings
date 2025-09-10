// Update rankings.json via GitHub API (works around read-only filesystem)
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    console.log('📝 Updating rankings.json via GitHub API...');
    
    try {
        // Parse request body to get rankings data
        const body = event.body ? JSON.parse(event.body) : {};
        const rankingsData = body.data;
        
        if (!rankingsData) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: 'No rankings data provided'
                })
            };
        }
        
        // GitHub API configuration
        const githubToken = process.env.GITHUB_TOKEN;
        const repo = process.env.GITHUB_REPO || 'coffewhale/boone-football-rankings';
        
        if (!githubToken) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: 'GITHUB_TOKEN environment variable not set'
                })
            };
        }
        
        // Add metadata to rankings
        const outputData = {
            ...rankingsData,
            lastUpdated: new Date().toISOString(),
            week: getCurrentWeekNumber(),
            scrapedAt: new Date().toISOString(),
            scrapingMethod: 'CSV-Auto-Discovery',
            totalPlayers: Object.values(rankingsData).reduce((sum, rankings) => sum + rankings.length, 0)
        };
        
        // Get current file to get SHA
        const getCurrentFile = await fetch(`https://api.github.com/repos/${repo}/contents/rankings.json`, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'User-Agent': 'Boone-Rankings-Bot'
            }
        });
        
        let sha = null;
        if (getCurrentFile.ok) {
            const currentFileData = await getCurrentFile.json();
            sha = currentFileData.sha;
        }
        
        // Prepare the new content
        const content = JSON.stringify(outputData, null, 2);
        const encodedContent = Buffer.from(content).toString('base64');
        
        // Update the file
        const updateResponse = await fetch(`https://api.github.com/repos/${repo}/contents/rankings.json`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'User-Agent': 'Boone-Rankings-Bot',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update Week ${getCurrentWeekNumber()} rankings - ${outputData.totalPlayers} players\n\n🤖 Auto-generated via CSV scraping`,
                content: encodedContent,
                sha: sha // Include SHA if file exists
            })
        });
        
        if (!updateResponse.ok) {
            const errorData = await updateResponse.text();
            throw new Error(`GitHub API error: ${updateResponse.status} - ${errorData}`);
        }
        
        const result = await updateResponse.json();
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Rankings updated successfully via GitHub API',
                totalPlayers: outputData.totalPlayers,
                week: outputData.week,
                commitSha: result.commit.sha,
                commitUrl: result.commit.html_url
            }, null, 2)
        };
        
    } catch (error) {
        console.error('❌ Error updating via GitHub:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

function getCurrentWeekNumber() {
    const seasonStart = new Date('2025-09-05');
    const now = new Date();
    const weeksDiff = Math.floor((now - seasonStart) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(18, weeksDiff + 1));
}