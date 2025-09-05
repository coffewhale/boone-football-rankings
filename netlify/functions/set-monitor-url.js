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

        // For now, just return success - we'll implement a simple in-memory approach
        console.log(`Monitor URL set: Week ${weekNumber} - ${qbUrl}`);
        
        // Store in a simple global variable for this session
        global.monitorConfig = {
            active: true,
            url: qbUrl,
            weekNumber: weekNumber,
            lastCheck: null,
            articleTimestamp: null,
            updateAvailable: false,
            setAt: new Date().toISOString()
        };

        console.log('Monitor config stored in memory:', global.monitorConfig);

        console.log(`Monitor set for Week ${weekNumber}: ${qbUrl}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Monitor set for Week ${weekNumber}`,
                config: global.monitorConfig
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