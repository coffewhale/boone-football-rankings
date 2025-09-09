exports.handler = async (event, context) => {
  try {
    console.log('🔍 Debug: Checking scraper configuration and status...');
    
    // Check active hours
    const now = new Date();
    const etHour = getETHour(now);
    const isActiveHours = etHour >= 6 && etHour < 18;
    
    // Get configuration
    const config = {
      monitor_url: process.env.MONITOR_URL || "",
      last_stored_timestamp: process.env.LAST_STORED_TIMESTAMP || null,
      flex_urls: (process.env.FLEX_URLS || "").split(',').filter(url => url.trim()),
      total_datawrapper_urls: {
        qb: (process.env.QB_URLS || "").split(',').filter(url => url.trim()).length,
        rb: (process.env.RB_URLS || "").split(',').filter(url => url.trim()).length,
        wr: (process.env.WR_URLS || "").split(',').filter(url => url.trim()).length,
        te: (process.env.TE_URLS || "").split(',').filter(url => url.trim()).length,
        flex: (process.env.FLEX_URLS || "").split(',').filter(url => url.trim()).length,
        def: (process.env.DEF_URLS || "").split(',').filter(url => url.trim()).length,
        k: (process.env.K_URLS || "").split(',').filter(url => url.trim()).length
      }
    };
    
    // Try to check current timestamp
    let timestampResult = null;
    let timestampError = null;
    
    if (config.monitor_url) {
      try {
        const fetch = require('node-fetch');
        const cheerio = require('cheerio');
        
        console.log('📡 Fetching Yahoo article...');
        const response = await fetch(config.monitor_url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 15000
        });
        
        if (response.ok) {
          const html = await response.text();
          const $ = cheerio.load(html);
          
          const selectors = ['.content-timestamp time', 'time[datetime]', '[data-timestamp]'];
          let currentTimestamp = null;
          
          for (const selector of selectors) {
            const element = $(selector);
            if (element.length > 0) {
              currentTimestamp = element.attr('datetime') || element.attr('data-timestamp');
              if (currentTimestamp) break;
            }
          }
          
          timestampResult = {
            current: currentTimestamp,
            stored: config.last_stored_timestamp,
            updateNeeded: !config.last_stored_timestamp || currentTimestamp !== config.last_stored_timestamp
          };
        } else {
          timestampError = `HTTP ${response.status}`;
        }
      } catch (error) {
        timestampError = error.message;
      }
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        debug: true,
        currentTime: now.toISOString(),
        etHour: etHour,
        isActiveHours: isActiveHours,
        configuration: {
          hasMonitorUrl: !!config.monitor_url,
          monitorUrl: config.monitor_url,
          hasStoredTimestamp: !!config.last_stored_timestamp,
          storedTimestamp: config.last_stored_timestamp,
          flexUrlsCount: config.flex_urls.length,
          totalDatawrapperUrls: config.total_datawrapper_urls
        },
        timestampCheck: timestampResult ? {
          currentTimestamp: timestampResult.current,
          storedTimestamp: timestampResult.stored,
          updateNeeded: timestampResult.updateNeeded
        } : {
          error: timestampError
        },
        nextSteps: isActiveHours ? 
          (config.monitor_url && config.flex_urls.length ? 
            'Ready to scrape if timestamp/content changed' : 
            'Missing monitor URL or FLEX URLs') :
          `Outside active hours (${etHour}:00 ET). Next check: 6 AM ET.`
      })
    };
    
  } catch (error) {
    console.error('Debug error:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        debug: true,
        error: error.message,
        stack: error.stack
      })
    };
  }
};

function getETHour(date) {
  const utcHour = date.getUTCHours();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  
  const isDST = (month > 3 && month < 11) || 
                (month === 3 && day >= 8) || 
                (month === 11 && day <= 7);
  
  const etOffset = isDST ? -4 : -5;
  let etHour = utcHour + etOffset;
  
  if (etHour < 0) etHour += 24;
  if (etHour >= 24) etHour -= 24;
  
  return etHour;
}