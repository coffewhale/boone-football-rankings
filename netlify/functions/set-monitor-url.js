// Set URL to monitor for timestamp changes
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

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, error: 'Method not allowed' })
        };
    }

    try {
        const { weekNumber, qbUrl } = JSON.parse(event.body);

        if (!weekNumber || !qbUrl) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Week number and QB URL are required'
                })
            };
        }

        // Validate URL format
        if (!qbUrl.includes('sports.yahoo.com/fantasy/article/')) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid Yahoo Sports URL format'
                })
            };
        }

        // Save monitor configuration
        const monitorConfig = {
            active: true,
            url: qbUrl,
            weekNumber: weekNumber,
            lastCheck: null,
            articleTimestamp: null,
            updateAvailable: false,
            setAt: new Date().toISOString()
        };

        // Try to save to /tmp, but don't fail if it doesn't work
        try {
            const monitorPath = path.join('/tmp', 'monitor_config.json');
            await fs.writeFile(monitorPath, JSON.stringify(monitorConfig, null, 2));
            console.log('Monitor config saved to /tmp successfully');
        } catch (tmpError) {
            console.log('Failed to save to /tmp:', tmpError.message);
            // Continue anyway - the function will still return success
        }

        // Also clear any stored timestamp to force initial check
        const timestampPath = path.join('/tmp', 'last_timestamp.txt');
        try {
            await fs.unlink(timestampPath);
        } catch (e) {
            // File might not exist, that's okay
        }

        console.log(`Monitor set for Week ${weekNumber}: ${qbUrl}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Monitor set for Week ${weekNumber}`,
                config: monitorConfig
            })
        };

    } catch (error) {
        console.error('Error setting monitor URL:', error);
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