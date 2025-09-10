// Test the trigger logic for automated scraping
const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    console.log('🕐 Testing automated scraper trigger logic...');
    
    try {
        const monitorUrl = process.env.MONITOR_URL || "";
        const lastStoredTimestamp = process.env.LAST_STORED_TIMESTAMP || null;
        
        if (!monitorUrl) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: 'No MONITOR_URL configured'
                })
            };
        }
        
        // STEP 1: Check timestamp
        console.log(`🔍 Checking timestamp at: ${monitorUrl}`);
        
        const response = await fetch(monitorUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            timeout: 15000
        });
        
        if (!response.ok) {
            throw new Error(`Yahoo article request failed: HTTP ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Look for timestamp
        const selectors = ['.content-timestamp time', 'time[datetime]', '[data-timestamp]'];
        let currentTimestamp = null;
        
        for (const selector of selectors) {
            const element = $(selector);
            if (element.length > 0) {
                currentTimestamp = element.attr('datetime') || element.attr('data-timestamp');
                if (currentTimestamp) break;
            }
        }
        
        if (!currentTimestamp) {
            // Try to find any datetime in the page
            const timeElements = $('time').toArray();
            for (const timeEl of timeElements) {
                const datetime = $(timeEl).attr('datetime');
                if (datetime) {
                    currentTimestamp = datetime;
                    break;
                }
            }
        }
        
        const updateNeeded = !lastStoredTimestamp || currentTimestamp !== lastStoredTimestamp;
        
        // STEP 2: Test CSV access
        const testResults = {};
        const flexUrls = (process.env.FLEX_URLS || "").split(',').filter(url => url.trim());
        
        if (flexUrls.length > 0) {
            try {
                const flexUrl = flexUrls[0];
                const csvUrl = convertToCSVEndpoint(flexUrl);
                
                const csvResponse = await fetch(csvUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    timeout: 10000
                });
                
                if (csvResponse.ok) {
                    const csvText = await csvResponse.text();
                    const lines = csvText.split('\n');
                    testResults.csvAccessible = true;
                    testResults.csvLines = lines.length;
                    testResults.csvSample = lines.slice(0, 3);
                } else {
                    testResults.csvAccessible = false;
                    testResults.csvError = `HTTP ${csvResponse.status}`;
                }
            } catch (e) {
                testResults.csvAccessible = false;
                testResults.csvError = e.message;
            }
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                timestamp_check: {
                    currentTimestamp: currentTimestamp,
                    storedTimestamp: lastStoredTimestamp,
                    updateNeeded: updateNeeded,
                    timestampFound: !!currentTimestamp
                },
                csv_test: testResults,
                next_action: updateNeeded ? 'Would trigger scraping' : 'No scraping needed'
            }, null, 2)
        };
        
    } catch (error) {
        console.error('❌ Error in trigger test:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

function convertToCSVEndpoint(datawrapperUrl) {
    if (datawrapperUrl.includes('datawrapper.dwcdn.net')) {
        const match = datawrapperUrl.match(/datawrapper\.dwcdn\.net\/([^\/]+)/);
        if (match) {
            return `https://datawrapper.dwcdn.net/${match[1]}/1/dataset.csv`;
        }
    }
    
    if (datawrapperUrl.includes('www.datawrapper.de/_/')) {
        const match = datawrapperUrl.match(/www\.datawrapper\.de\/_\/([^\/]+)/);
        if (match) {
            return `https://datawrapper.dwcdn.net/${match[1]}/1/dataset.csv`;
        }
    }
    
    const chartIdMatch = datawrapperUrl.match(/([a-zA-Z0-9]{5,})/);
    if (chartIdMatch) {
        return `https://datawrapper.dwcdn.net/${chartIdMatch[1]}/1/dataset.csv`;
    }
    
    throw new Error(`Cannot convert URL: ${datawrapperUrl}`);
}