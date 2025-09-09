const { chromium } = require('playwright-chromium');
const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  try {
    console.log('🚀 Force scraping ALL positions...');
    
    // Get configuration from environment variables
    const config = {
      qb: (process.env.QB_URLS || "").split(',').filter(url => url.trim()),
      rb: (process.env.RB_URLS || "").split(',').filter(url => url.trim()),
      wr: (process.env.WR_URLS || "").split(',').filter(url => url.trim()),
      te: (process.env.TE_URLS || "").split(',').filter(url => url.trim()),
      flex: (process.env.FLEX_URLS || "").split(',').filter(url => url.trim()),
      def: (process.env.DEF_URLS || "").split(',').filter(url => url.trim()),
      k: (process.env.K_URLS || "").split(',').filter(url => url.trim())
    };
    
    console.log('📋 URLs configured:');
    Object.entries(config).forEach(([pos, urls]) => {
      console.log(`  ${pos.toUpperCase()}: ${urls.length} URL(s)`);
    });
    
    // Scrape all positions
    const results = await scrapeAllPositions(config);
    
    const totalPlayers = Object.values(results).reduce((sum, rankings) => sum + rankings.length, 0);
    
    if (totalPlayers === 0) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'No data scraped from any position'
        })
      };
    }
    
    // Update rankings.json
    await updateRankingsFile(results);
    
    console.log('🎉 SUCCESS! All positions scraped and updated');
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'All positions scraped successfully',
        totalPlayers: totalPlayers,
        positions: Object.entries(results).map(([pos, rankings]) => 
          `${pos.toUpperCase()}: ${rankings.length}`
        ),
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('❌ Error in force scrape:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

async function scrapeAllPositions(config) {
  const results = {};
  const browser = await chromium.launch();
  
  try {
    for (const [position, urls] of Object.entries(config)) {
      if (!urls || urls.length === 0) {
        console.log(`⚠️ ${position.toUpperCase()}: No URLs configured`);
        results[position] = [];
        continue;
      }
      
      console.log(`🔍 Scraping ${position.toUpperCase()} from ${urls.length} URL(s)`);
      const rankings = await scrapePosition(browser, position, urls);
      results[position] = rankings;
      console.log(`  ✅ ${rankings.length} players`);
      
      // Brief pause between positions
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return results;
    
  } finally {
    await browser.close();
  }
}

async function scrapePosition(browser, position, urls) {
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    let page;
    
    try {
      console.log(`  📄 Attempting URL ${i + 1}/${urls.length}: ${url}`);
      
      page = await browser.newPage();
      await page.goto(url, { timeout: 30000 });
      
      // Wait for table to load
      await page.waitForSelector('table', { timeout: 20000 });
      await page.waitForTimeout(3000);
      
      const rankings = [];
      const rows = await page.locator('tbody tr[class*="svelte"]').all();
      
      console.log(`  📊 Found ${rows.length} table rows`);
      
      for (const row of rows) {
        try {
          const rankingData = await extractRowData(row, position);
          if (rankingData) {
            rankings.push(rankingData);
          }
        } catch (e) {
          // Skip invalid rows
        }
      }
      
      if (rankings.length > 0) {
        console.log(`    ✅ Successfully scraped ${rankings.length} players`);
        return rankings;
      } else {
        console.log(`    ❌ No valid player data found`);
      }
      
    } catch (error) {
      console.log(`    ❌ Error with URL: ${error.message}`);
    } finally {
      if (page) await page.close();
    }
  }
  
  console.log(`  ⚠️ No data scraped for ${position.toUpperCase()}`);
  return [];
}

async function extractRowData(row, position) {
  try {
    const rankElem = row.locator('th[class*="svelte"]').first();
    const rank = await rankElem.innerText();
    const rankNum = rank.trim();
    
    const tdElements = await row.locator('td[class*="svelte"]').all();
    
    if (tdElements.length < 2 || !rankNum.match(/^\d+$/)) {
      return null;
    }
    
    const player = await tdElements[0].innerText();
    const opponent = tdElements.length > 1 ? await tdElements[tdElements.length - 1].innerText() : 'N/A';
    
    return {
      preGameRank: parseInt(rankNum),
      player: player.trim(),
      opponent: opponent.trim()
    };
    
  } catch (error) {
    return null;
  }
}

async function updateRankingsFile(results) {
  try {
    // Create backup
    const timestamp = Date.now();
    const backupPath = path.join(process.cwd(), `rankings.json.backup.${timestamp}`);
    
    try {
      const existingData = await fs.readFile(path.join(process.cwd(), 'rankings.json'), 'utf8');
      await fs.writeFile(backupPath, existingData);
      console.log(`📄 Backup created: rankings.json.backup.${timestamp}`);
    } catch (e) {
      console.log('📄 No existing file to backup');
    }
    
    // Write new rankings
    const rankingsPath = path.join(process.cwd(), 'rankings.json');
    const formattedResults = JSON.stringify(results, null, 2);
    await fs.writeFile(rankingsPath, formattedResults);
    
    console.log('✅ rankings.json updated successfully');
    
    // Log summary
    const summary = Object.entries(results).map(([position, rankings]) => 
      `${position.toUpperCase()}: ${rankings.length}`
    ).join(', ');
    console.log(`📊 Updated rankings: ${summary}`);
    
  } catch (error) {
    console.error('❌ Error updating rankings file:', error);
    throw error;
  }
}