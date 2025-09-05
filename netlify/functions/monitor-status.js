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
    try {
        const monitorPath = path.join('/tmp', 'monitor_config.json');
        const data = await fs.readFile(monitorPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Return default if no config exists
        return {
            active: false,
            url: null,
            weekNumber: null,
            lastCheck: null,
            articleTimestamp: null,
            updateAvailable: false
        };
    }
}