// Manual check for timestamp changes
const fetch = require('node-fetch');
const cheerio = require('cheerio');
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
        let qbUrl;
        
        // Try to get URL from request body first
        if (event.body) {
            try {
                const body = JSON.parse(event.body);
                qbUrl = body.qbUrl;
            } catch (e) {
                // Ignore parse error, try fallback
            }
        }
        
        // Fallback: Get monitor configuration from server
        if (!qbUrl) {
            const monitorConfig = await getMonitorConfig();
            if (!monitorConfig || !monitorConfig.active || !monitorConfig.url) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'No monitor URL configured. Please set a URL first.'
                    })
                };
            }
            qbUrl = monitorConfig.url;
        }

        console.log(`Manual check for: ${qbUrl}`);

        // Check for timestamp changes
        const checkResult = await checkTimestampChange(qbUrl);

        // Log notification if update available
        if (checkResult.updateAvailable) {
            await logNotification(`Manual check: Update available! Article timestamp: ${checkResult.currentTimestamp}`);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                updateAvailable: checkResult.updateAvailable,
                articleTimestamp: checkResult.currentTimestamp,
                lastStoredTimestamp: checkResult.lastStoredTimestamp,
                message: checkResult.updateAvailable ? 
                    'Update available! Boone has updated his rankings.' : 
                    'No update needed - timestamps match.'
            })
        };

    } catch (error) {
        console.error('Error in manual monitor check:', error);
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

async function getMonitorConfig() {
    try {
        const monitorPath = path.join('/tmp', 'monitor_config.json');
        const data = await fs.readFile(monitorPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return null;
    }
}

async function saveMonitorConfig(config) {
    const monitorPath = path.join('/tmp', 'monitor_config.json');
    await fs.writeFile(monitorPath, JSON.stringify(config, null, 2));
}

async function checkTimestampChange(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Extract timestamp from content-timestamp div
        const timestampElement = $('.content-timestamp time');
        const currentTimestamp = timestampElement.attr('datetime');
        
        if (!currentTimestamp) {
            throw new Error('No timestamp found on page');
        }

        // Get stored timestamp for comparison
        const lastStoredTimestamp = await getLastStoredTimestamp();
        
        const updateAvailable = !lastStoredTimestamp || currentTimestamp !== lastStoredTimestamp;
        
        console.log(`Timestamp check - Current: ${currentTimestamp}, Last: ${lastStoredTimestamp}, Update available: ${updateAvailable}`);
        
        // Store new timestamp if changed
        if (updateAvailable) {
            await storeLastTimestamp(currentTimestamp);
        }
        
        return { 
            updateAvailable, 
            currentTimestamp,
            lastStoredTimestamp
        };
        
    } catch (error) {
        console.error('Error checking timestamp:', error);
        throw error;
    }
}

async function getLastStoredTimestamp() {
    try {
        const timestampPath = path.join('/tmp', 'last_timestamp.txt');
        const timestamp = await fs.readFile(timestampPath, 'utf8');
        return timestamp.trim();
    } catch (error) {
        return null; // First time or file doesn't exist
    }
}

async function storeLastTimestamp(timestamp) {
    if (!timestamp) return;
    
    try {
        const timestampPath = path.join('/tmp', 'last_timestamp.txt');
        await fs.writeFile(timestampPath, timestamp);
        console.log(`Stored timestamp: ${timestamp}`);
    } catch (error) {
        console.error('Error storing timestamp:', error);
    }
}

async function logNotification(message) {
    try {
        const logPath = path.join('/tmp', 'notification_log.json');
        let log = [];
        
        try {
            const logData = await fs.readFile(logPath, 'utf8');
            log = JSON.parse(logData);
        } catch (e) {
            // File doesn't exist or is invalid, start fresh
        }
        
        log.unshift({
            timestamp: new Date().toISOString(),
            message: message
        });
        
        // Keep only last 50 entries
        log = log.slice(0, 50);
        
        await fs.writeFile(logPath, JSON.stringify(log, null, 2));
    } catch (error) {
        console.error('Error logging notification:', error);
    }
}