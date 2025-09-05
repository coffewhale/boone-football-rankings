// Get current monitor status
const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const monitorData = await getMonitorData();
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                monitor: monitorData
            })
        };
    } catch (error) {
        console.error('Error getting monitor status:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

async function getMonitorData() {
    // Try to read from global variable first
    if (global.monitorConfig) {
        console.log('Successfully read monitor config from memory:', global.monitorConfig);
        return global.monitorConfig;
    }
    
    // Fallback: try to read from /tmp
    try {
        const monitorPath = path.join('/tmp', 'monitor_config.json');
        const data = await fs.readFile(monitorPath, 'utf8');
        const config = JSON.parse(data);
        console.log('Successfully read monitor config from /tmp:', config);
        // Store in memory for next time
        global.monitorConfig = config;
        return config;
    } catch (error) {
        console.log('Could not read monitor config:', error.message);
        // Return default if no config exists
        return {
            active: false,
            url: null,
            weekNumber: null,
            lastCheck: null,
            articleTimestamp: null,
            updateAvailable: false,
            error: 'No configuration found - set a URL first'
        };
    }
}