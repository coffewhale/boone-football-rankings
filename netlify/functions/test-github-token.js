// Test GitHub token and basic functionality
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    console.log('🧪 Testing GitHub token and environment...');
    
    try {
        // Test 1: Check environment variables
        const githubToken = process.env.GITHUB_TOKEN;
        const repo = process.env.GITHUB_REPO || 'coffewhale/boone-football-rankings';
        const monitorUrl = process.env.MONITOR_URL;
        const lastTimestamp = process.env.LAST_STORED_TIMESTAMP;
        
        console.log('📋 Environment check:');
        console.log(`  GITHUB_TOKEN: ${githubToken ? '✅ Set' : '❌ Missing'}`);
        console.log(`  GITHUB_REPO: ${repo}`);
        console.log(`  MONITOR_URL: ${monitorUrl ? '✅ Set' : '❌ Missing'}`);
        console.log(`  LAST_STORED_TIMESTAMP: ${lastTimestamp || 'None'}`);
        
        if (!githubToken) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'GITHUB_TOKEN environment variable not set',
                    envCheck: {
                        githubToken: false,
                        repo: repo,
                        monitorUrl: !!monitorUrl,
                        lastTimestamp: lastTimestamp
                    }
                })
            };
        }
        
        // Test 2: Check GitHub API access
        console.log('🔑 Testing GitHub API access...');
        const testResponse = await fetch(`https://api.github.com/repos/${repo}`, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'User-Agent': 'Boone-Rankings-Bot'
            }
        });
        
        if (!testResponse.ok) {
            const errorText = await testResponse.text();
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: `GitHub API access failed: ${testResponse.status}`,
                    details: errorText,
                    repo: repo
                })
            };
        }
        
        const repoData = await testResponse.json();
        console.log('✅ GitHub API access successful');
        
        // Test 3: Check if rankings.json exists
        console.log('📄 Checking for existing rankings.json...');
        const fileResponse = await fetch(`https://api.github.com/repos/${repo}/contents/rankings.json`, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'User-Agent': 'Boone-Rankings-Bot'
            }
        });
        
        let fileExists = false;
        let fileSha = null;
        if (fileResponse.ok) {
            const fileData = await fileResponse.json();
            fileExists = true;
            fileSha = fileData.sha;
            console.log('✅ rankings.json exists');
        } else {
            console.log('ℹ️ rankings.json does not exist (will be created)');
        }
        
        // Test 4: Test timestamp fetching
        let timestampTest = null;
        if (monitorUrl) {
            console.log('⏰ Testing timestamp fetching...');
            try {
                const timestampResponse = await fetch(monitorUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; Boone-Rankings-Bot)'
                    },
                    timeout: 10000
                });
                
                if (timestampResponse.ok) {
                    timestampTest = 'Success - can fetch Yahoo article';
                } else {
                    timestampTest = `Failed - HTTP ${timestampResponse.status}`;
                }
            } catch (e) {
                timestampTest = `Error - ${e.message}`;
            }
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                tests: {
                    environment: 'Pass',
                    githubApiAccess: 'Pass',
                    repoAccess: `Pass - ${repoData.name}`,
                    rankingsFileExists: fileExists,
                    fileSha: fileSha,
                    timestampFetch: timestampTest
                },
                message: 'All tests passed! GitHub integration is ready.',
                nextStep: 'Ready to test the full scraper function'
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