// Auto-discover CSV URLs from Datawrapper pages
const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    console.log('🔍 Auto-discovering CSV URLs from Datawrapper pages...');
    
    try {
        const config = {
            datawrapper_urls: {
                qb: (process.env.QB_URLS || "").split(',').filter(url => url.trim()),
                rb: (process.env.RB_URLS || "").split(',').filter(url => url.trim()),
                wr: (process.env.WR_URLS || "").split(',').filter(url => url.trim()),
                te: (process.env.TE_URLS || "").split(',').filter(url => url.trim()),
                flex: (process.env.FLEX_URLS || "").split(',').filter(url => url.trim()),
                def: (process.env.DEF_URLS || "").split(',').filter(url => url.trim()),
                k: (process.env.K_URLS || "").split(',').filter(url => url.trim())
            }
        };
        
        const discoveredUrls = {};
        const details = {};
        
        for (const [position, urls] of Object.entries(config.datawrapper_urls)) {
            if (!urls || urls.length === 0) {
                discoveredUrls[position] = [];
                details[position] = { error: 'No URLs configured' };
                continue;
            }
            
            console.log(`🔍 Discovering CSV for ${position.toUpperCase()}...`);
            const result = await discoverCSVUrl(urls[0]);
            discoveredUrls[position] = result.csvUrls;
            details[position] = result.details;
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                discoveredCsvUrls: discoveredUrls,
                details: details,
                envVariableSuggestions: generateEnvVariables(discoveredUrls)
            }, null, 2)
        };
        
    } catch (error) {
        console.error('❌ Error in CSV discovery:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

async function discoverCSVUrl(datawrapperUrl) {
    const details = {
        originalUrl: datawrapperUrl,
        steps: [],
        errors: []
    };
    
    try {
        console.log(`  📄 Fetching page: ${datawrapperUrl}`);
        details.steps.push(`Fetching: ${datawrapperUrl}`);
        
        // Fetch the Datawrapper page
        const response = await fetch(datawrapperUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 15000
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Method 1: Look for CSV download links
        const csvLinks = [];
        $('a[href*="dataset.csv"]').each((i, elem) => {
            const href = $(elem).attr('href');
            if (href) {
                csvLinks.push(new URL(href, datawrapperUrl).href);
            }
        });
        
        if (csvLinks.length > 0) {
            details.steps.push(`Found CSV links via download buttons: ${csvLinks.length}`);
            return { csvUrls: csvLinks, details };
        }
        
        // Method 2: Extract chart ID and build CSV URL
        let chartId = null;
        
        // Try to find chart ID in various places
        const urlMatch = datawrapperUrl.match(/\/([a-zA-Z0-9]{5,})\/?\??/);
        if (urlMatch) {
            chartId = urlMatch[1];
            details.steps.push(`Extracted chart ID from URL: ${chartId}`);
        }
        
        // Look for chart ID in page content
        if (!chartId) {
            const scriptTags = $('script').toArray();
            for (const script of scriptTags) {
                const scriptContent = $(script).html() || '';
                const idMatch = scriptContent.match(/"chartId":\s*"([a-zA-Z0-9]{5,})"/);
                if (idMatch) {
                    chartId = idMatch[1];
                    details.steps.push(`Found chart ID in script: ${chartId}`);
                    break;
                }
            }
        }
        
        // Look for data-chart-id attributes
        if (!chartId) {
            const chartElements = $('[data-chart-id]');
            if (chartElements.length > 0) {
                chartId = chartElements.first().attr('data-chart-id');
                details.steps.push(`Found chart ID in data attribute: ${chartId}`);
            }
        }
        
        if (chartId) {
            // Try different CSV URL patterns
            const csvUrls = [
                `https://datawrapper.dwcdn.net/${chartId}/dataset.csv`,
                `https://datawrapper.dwcdn.net/${chartId}/1/dataset.csv`,
                `https://datawrapper.dwcdn.net/${chartId}/2/dataset.csv`
            ];
            
            // Test which URLs actually work
            const workingUrls = [];
            for (const csvUrl of csvUrls) {
                try {
                    const testResponse = await fetch(csvUrl, {
                        method: 'HEAD',
                        headers: { 'User-Agent': 'Mozilla/5.0' },
                        timeout: 10000
                    });
                    
                    if (testResponse.ok) {
                        workingUrls.push(csvUrl);
                        details.steps.push(`✅ Working CSV URL: ${csvUrl}`);
                    }
                } catch (e) {
                    details.steps.push(`❌ Failed CSV URL: ${csvUrl} (${e.message})`);
                }
            }
            
            if (workingUrls.length > 0) {
                return { csvUrls: workingUrls, details };
            }
        }
        
        // Method 3: Look for iframe src or embedded chart URLs
        const iframes = $('iframe').toArray();
        for (const iframe of iframes) {
            const src = $(iframe).attr('src');
            if (src && src.includes('datawrapper')) {
                details.steps.push(`Found iframe: ${src}`);
                const iframeResult = await discoverCSVUrl(src);
                if (iframeResult.csvUrls.length > 0) {
                    return iframeResult;
                }
            }
        }
        
        throw new Error('No CSV URL could be discovered from this page');
        
    } catch (error) {
        details.errors.push(error.message);
        console.log(`    ❌ Error: ${error.message}`);
        return { csvUrls: [], details };
    }
}

function generateEnvVariables(discoveredUrls) {
    const suggestions = [];
    
    for (const [position, urls] of Object.entries(discoveredUrls)) {
        if (urls.length > 0) {
            const envVar = `${position.toUpperCase()}_CSV_URLS`;
            suggestions.push(`${envVar} = ${urls[0]}`);
        }
    }
    
    return suggestions;
}