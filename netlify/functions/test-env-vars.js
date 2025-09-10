// Quick test to check what environment variables are available
exports.handler = async (event, context) => {
    console.log('🧪 Checking environment variables...');
    
    const requiredVars = [
        'GITHUB_TOKEN',
        'GITHUB_REPO', 
        'MONITOR_URL',
        'LAST_STORED_TIMESTAMP',
        'MONITOR_WEEK'
    ];
    
    const envStatus = {};
    
    for (const varName of requiredVars) {
        const value = process.env[varName];
        envStatus[varName] = {
            exists: !!value,
            length: value ? value.length : 0,
            preview: value ? value.substring(0, 20) + '...' : null
        };
    }
    
    return {
        statusCode: 200,
        body: JSON.stringify({
            environmentVariables: envStatus,
            allKeys: Object.keys(process.env).filter(k => 
                k.includes('GITHUB') || 
                k.includes('MONITOR') || 
                k.includes('LAST_') ||
                k.includes('QB_') ||
                k.includes('RB_')
            )
        }, null, 2)
    };
};