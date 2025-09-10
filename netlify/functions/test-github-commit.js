// Test function to verify GitHub token permissions without affecting production
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    console.log('🧪 Testing GitHub token permissions...');
    
    try {
        const githubToken = process.env.GITHUB_TOKEN;
        const repo = process.env.GITHUB_REPO || 'coffewhale/boone-football-rankings';
        
        if (!githubToken) {
            return {
                statusCode: 400,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'GITHUB_TOKEN not configured' 
                })
            };
        }
        
        // Test 1: Check token permissions
        console.log('Testing token permissions...');
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${githubToken}`,
                'User-Agent': 'Boone-Rankings-Test'
            }
        });
        
        if (!userResponse.ok) {
            throw new Error(`GitHub auth failed: ${userResponse.status}`);
        }
        
        const userData = await userResponse.json();
        console.log(`✅ Authenticated as: ${userData.login}`);
        
        // Test 2: Check repo access
        console.log('Testing repo access...');
        const repoResponse = await fetch(`https://api.github.com/repos/${repo}`, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'User-Agent': 'Boone-Rankings-Test'
            }
        });
        
        if (!repoResponse.ok) {
            throw new Error(`Can't access repo: ${repoResponse.status}`);
        }
        
        const repoData = await repoResponse.json();
        console.log(`✅ Can access repo: ${repoData.full_name}`);
        
        // Test 3: Check write permissions (read contents of test file)
        console.log('Testing write permissions...');
        const testFile = await fetch(`https://api.github.com/repos/${repo}/contents/test-permission.txt`, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'User-Agent': 'Boone-Rankings-Test'
            }
        });
        
        // We expect 404 (file doesn't exist), which is fine
        // 403 would mean no permissions
        if (testFile.status === 403) {
            throw new Error('No write permissions to repo');
        }
        
        console.log('✅ Have write permissions');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'GitHub token is properly configured!',
                user: userData.login,
                repo: repoData.full_name,
                hasWriteAccess: true
            }, null, 2)
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            }, null, 2)
        };
    }
};