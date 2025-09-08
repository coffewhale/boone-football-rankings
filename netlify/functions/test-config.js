// Test function to verify environment variables are configured correctly
exports.handler = async (event, context) => {
    try {
        // Check all environment variables
        const config = {
            monitor_url: process.env.MONITOR_URL || "❌ NOT SET",
            last_stored_timestamp: process.env.LAST_STORED_TIMESTAMP || "❌ NOT SET",
            urls: {
                qb: (process.env.QB_URLS || "").split(',').filter(url => url.trim()),
                rb: (process.env.RB_URLS || "").split(',').filter(url => url.trim()),
                wr: (process.env.WR_URLS || "").split(',').filter(url => url.trim()),
                te: (process.env.TE_URLS || "").split(',').filter(url => url.trim()),
                flex: (process.env.FLEX_URLS || "").split(',').filter(url => url.trim()),
                def: (process.env.DEF_URLS || "").split(',').filter(url => url.trim()),
                k: (process.env.K_URLS || "").split(',').filter(url => url.trim())
            }
        };
        
        // Calculate totals
        const totalUrls = Object.values(config.urls).reduce((sum, urls) => sum + urls.length, 0);
        
        // Check which positions are configured
        const configuredPositions = [];
        const missingPositions = [];
        
        Object.entries(config.urls).forEach(([position, urls]) => {
            if (urls.length > 0) {
                configuredPositions.push(`${position.toUpperCase()}: ${urls.length} URL(s)`);
            } else {
                missingPositions.push(position.toUpperCase());
            }
        });
        
        // Overall status
        const isFullyConfigured = config.monitor_url !== "❌ NOT SET" && 
                                 config.last_stored_timestamp !== "❌ NOT SET" && 
                                 totalUrls > 0;
        
        const status = isFullyConfigured ? "✅ READY" : "⚠️ NEEDS CONFIGURATION";
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: status,
                configuration: {
                    monitor_url: config.monitor_url,
                    last_stored_timestamp: config.last_stored_timestamp,
                    total_urls: totalUrls
                },
                positions: {
                    configured: configuredPositions,
                    missing: missingPositions
                },
                test_results: {
                    monitor_url_set: config.monitor_url !== "❌ NOT SET",
                    timestamp_set: config.last_stored_timestamp !== "❌ NOT SET",
                    has_datawrapper_urls: totalUrls > 0,
                    flex_urls_configured: config.urls.flex.length > 0
                },
                next_steps: isFullyConfigured ? 
                    ["Configuration looks good! Test the main scraper function."] :
                    [
                        "Set missing environment variables in Netlify Dashboard",
                        "Go to Site Settings → Environment Variables",
                        "Add any missing variables shown above"
                    ]
            }, null, 2)
        };
        
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: "❌ ERROR",
                error: error.message
            }, null, 2)
        };
    }
};