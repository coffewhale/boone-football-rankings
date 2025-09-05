// Scheduled function to check for timestamp changes every hour
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
    // This function is designed to be triggered by Netlify's scheduled functions
    // or can be called manually via webhook
    
    console.log('🔍 Hourly monitor check starting...');
    
    // Check if we're in active hours (6 AM ET to 6 PM ET)
    const now = new Date();
    const etHour = getETHour(now);
    const isActiveHours = etHour >= 6 && etHour < 18; // 6 AM to 6 PM ET
    
    if (!isActiveHours) {
        console.log(`⏰ Outside active hours (${etHour}:00 ET). Boone only updates between 6 AM and 6 PM ET.`);
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: `Outside active hours (${etHour}:00 ET). Next check will be during 6 AM - 6 PM ET.`
            })
        };
    }
    
    console.log(`✅ Active hours (${etHour}:00 ET) - proceeding with check`);
    
    try {
        // Get monitor configuration
        const monitorConfig = await getMonitorConfig();
        
        if (!monitorConfig || !monitorConfig.active || !monitorConfig.url) {
            console.log('❌ No active monitor configured, skipping check');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'No active monitor configured'
                })
            };
        }

        console.log(`✅ Checking URL: ${monitorConfig.url}`);

        // Check for timestamp changes
        const checkResult = await checkTimestampChange(monitorConfig.url);

        // Update monitor config with results
        monitorConfig.lastCheck = new Date().toISOString();
        monitorConfig.articleTimestamp = checkResult.currentTimestamp;
        monitorConfig.updateAvailable = checkResult.updateAvailable;

        await saveMonitorConfig(monitorConfig);

        if (checkResult.updateAvailable) {
            console.log('🚨 UPDATE DETECTED! Boone has updated his rankings!');
            
            // Log notification
            await logNotification(`Automated check: UPDATE AVAILABLE! Article updated at ${checkResult.currentTimestamp}`);
            
            // Send notification (email, webhook, etc.)
            await sendUpdateNotification(monitorConfig, checkResult);
            
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    updateAvailable: true,
                    message: 'Update detected and notification sent',
                    articleTimestamp: checkResult.currentTimestamp
                })
            };
        } else {
            console.log('✅ No update needed - timestamps match');
            
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    updateAvailable: false,
                    message: 'No update needed',
                    articleTimestamp: checkResult.currentTimestamp
                })
            };
        }

    } catch (error) {
        console.error('❌ Error in hourly monitor check:', error);
        
        // Log the error
        await logNotification(`Hourly check ERROR: ${error.message}`);
        
        return {
            statusCode: 500,
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
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Extract timestamp from content-timestamp div
        const timestampElement = $('.content-timestamp time');
        const currentTimestamp = timestampElement.attr('datetime');
        
        if (!currentTimestamp) {
            throw new Error('No timestamp found on page - page structure may have changed');
        }

        // Get stored timestamp for comparison
        const lastStoredTimestamp = await getLastStoredTimestamp();
        
        const updateAvailable = !lastStoredTimestamp || currentTimestamp !== lastStoredTimestamp;
        
        console.log(`📊 Timestamp comparison:
            Current: ${currentTimestamp}
            Last stored: ${lastStoredTimestamp || 'None'}
            Update needed: ${updateAvailable ? 'YES' : 'NO'}`);
        
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
        return null;
    }
}

async function storeLastTimestamp(timestamp) {
    if (!timestamp) return;
    
    try {
        const timestampPath = path.join('/tmp', 'last_timestamp.txt');
        await fs.writeFile(timestampPath, timestamp);
        console.log(`💾 Stored new timestamp: ${timestamp}`);
    } catch (error) {
        console.error('Error storing timestamp:', error);
    }
}

async function sendUpdateNotification(monitorConfig, checkResult) {
    try {
        // You can customize this section to send notifications via:
        // - Email (using services like SendGrid, Mailgun, etc.)
        // - Webhook to Discord, Slack, etc.
        // - Push notifications
        // - SMS
        
        console.log('📧 Sending update notification...');
        
        // Example: Log to console (replace with actual notification service)
        console.log(`
        🚨 BOONE RANKINGS UPDATE ALERT 🚨
        
        Week: ${monitorConfig.weekNumber}
        URL: ${monitorConfig.url}
        Updated: ${new Date(checkResult.currentTimestamp).toLocaleString()}
        
        Time to update your rankings site!
        `);
        
        // Send webhook notification (Discord/Slack)
        if (process.env.DISCORD_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL) {
            const webhookUrl = process.env.DISCORD_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;
            
            const payload = process.env.DISCORD_WEBHOOK_URL ? {
                // Discord format
                content: `🚨 **Boone Rankings Update!**`,
                embeds: [{
                    title: `Week ${monitorConfig.weekNumber} Rankings Updated`,
                    description: `Justin Boone has updated his fantasy football rankings!`,
                    color: 0xff6b35,
                    fields: [
                        { name: "Updated", value: new Date(checkResult.currentTimestamp).toLocaleString(), inline: true },
                        { name: "Week", value: monitorConfig.weekNumber.toString(), inline: true },
                        { name: "URL", value: `[View Rankings](${monitorConfig.url})` }
                    ],
                    footer: { text: "Time to update your site!" }
                }]
            } : {
                // Slack format  
                text: `🚨 Boone Rankings Update! Week ${monitorConfig.weekNumber} updated at ${new Date(checkResult.currentTimestamp).toLocaleString()}`,
                attachments: [{
                    color: "#ff6b35",
                    fields: [
                        { title: "Week", value: monitorConfig.weekNumber, short: true },
                        { title: "Updated", value: new Date(checkResult.currentTimestamp).toLocaleString(), short: true },
                        { title: "URL", value: monitorConfig.url }
                    ]
                }]
            };
            
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            console.log('📱 Webhook notification sent');
        }
        
        // Send email notification
        if (process.env.ADMIN_EMAIL) {
            await fetch(`${process.env.URL}/.netlify/functions/send-notification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'update',
                    weekNumber: monitorConfig.weekNumber,
                    articleTimestamp: checkResult.currentTimestamp,
                    url: monitorConfig.url
                })
            });
            
            console.log('📧 Email notification sent');
        }
        
        console.log('✅ Notification sent successfully');
        
    } catch (error) {
        console.error('Error sending notification:', error);
        // Don't throw - we still want to record that an update was detected
    }
}

function getETHour(date) {
    // Convert current time to Eastern Time
    // Note: This is a simple approximation. For production, consider using a proper timezone library
    const utcHour = date.getUTCHours();
    const month = date.getUTCMonth() + 1; // 1-12
    const day = date.getUTCDate();
    
    // Simple DST calculation for Eastern Time
    // DST typically runs from 2nd Sunday in March to 1st Sunday in November
    const isDST = (month > 3 && month < 11) || 
                  (month === 3 && day >= 8) || 
                  (month === 11 && day <= 7);
    
    const etOffset = isDST ? -4 : -5; // EDT (-4) or EST (-5)
    let etHour = utcHour + etOffset;
    
    // Handle day rollover
    if (etHour < 0) etHour += 24;
    if (etHour >= 24) etHour -= 24;
    
    return etHour;
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
        
        // Keep only last 100 entries
        log = log.slice(0, 100);
        
        await fs.writeFile(logPath, JSON.stringify(log, null, 2));
    } catch (error) {
        console.error('Error logging notification:', error);
    }
}