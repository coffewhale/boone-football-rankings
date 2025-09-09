const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  try {
    console.log('🔧 Simple restore: Attempting to restore all position rankings...');
    
    // Get URLs from environment variables
    const urls = {
      qb: (process.env.QB_URLS || "").split(',').filter(url => url.trim()),
      rb: (process.env.RB_URLS || "").split(',').filter(url => url.trim()),
      wr: (process.env.WR_URLS || "").split(',').filter(url => url.trim()),
      te: (process.env.TE_URLS || "").split(',').filter(url => url.trim()),
      flex: (process.env.FLEX_URLS || "").split(',').filter(url => url.trim()),
      def: (process.env.DEF_URLS || "").split(',').filter(url => url.trim()),
      k: (process.env.K_URLS || "").split(',').filter(url => url.trim())
    };
    
    console.log('📋 URL Configuration:');
    Object.entries(urls).forEach(([pos, posUrls]) => {
      console.log(`  ${pos.toUpperCase()}: ${posUrls.length} URL(s)`);
    });
    
    const results = {};
    
    // For each position, try to scrape with simple fetch
    for (const [position, positionUrls] of Object.entries(urls)) {
      if (!positionUrls || positionUrls.length === 0) {
        console.log(`⚠️ ${position.toUpperCase()}: No URLs configured`);
        results[position] = [];
        continue;
      }
      
      console.log(`🔍 Attempting ${position.toUpperCase()}...`);
      let positionData = [];
      
      for (const url of positionUrls) {
        try {
          console.log(`  📥 Fetching: ${url}`);
          
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 15000
          });
          
          if (!response.ok) {
            console.log(`    ❌ HTTP ${response.status}`);
            continue;
          }
          
          const html = await response.text();
          const $ = cheerio.load(html);
          
          // Look for table data (this is simplified - may not work for all Datawrapper formats)
          const rankings = [];
          let rank = 1;
          
          // Try common table selectors
          const possibleRows = $('tr').toArray();
          
          for (const row of possibleRows) {
            const $row = $(row);
            const cells = $row.find('td, th').toArray().map(cell => $(cell).text().trim());
            
            if (cells.length >= 2) {
              // Look for a pattern like: rank, player name, opponent
              const playerCell = cells.find(cell => 
                cell && 
                cell.length > 2 && 
                !cell.match(/^\\d+$/) && 
                !cell.toLowerCase().includes('rank') &&
                !cell.toLowerCase().includes('week')
              );
              
              const opponentCell = cells.find(cell => 
                cell && 
                (cell.includes('@') || cell.includes('vs') || cell.match(/^[A-Z]{2,4}$/))
              );
              
              if (playerCell) {
                rankings.push({
                  preGameRank: rank++,
                  player: playerCell,
                  opponent: opponentCell || 'N/A'
                });
                
                if (rankings.length >= 30) break; // Limit results
              }
            }
          }
          
          if (rankings.length > 0) {
            console.log(`    ✅ Found ${rankings.length} players`);
            positionData = rankings;
            break; // Success, stop trying other URLs for this position
          } else {
            console.log(`    ⚠️ No player data found`);
          }
          
        } catch (urlError) {
          console.log(`    ❌ Error: ${urlError.message}`);
        }
      }
      
      results[position] = positionData;
      console.log(`  📊 ${position.toUpperCase()}: ${positionData.length} players total`);
    }
    
    // Count total players found
    const totalPlayers = Object.values(results).reduce((sum, pos) => sum + pos.length, 0);
    
    if (totalPlayers === 0) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'No player data could be scraped from any position',
          urls: urls
        })
      };
    }
    
    // Create backup of current rankings.json
    const timestamp = Date.now();
    try {
      const currentData = await fs.readFile(path.join(process.cwd(), 'rankings.json'), 'utf8');
      await fs.writeFile(path.join(process.cwd(), `rankings.json.backup.${timestamp}`), currentData);
      console.log(`📄 Created backup: rankings.json.backup.${timestamp}`);
    } catch (e) {
      console.log('📄 No existing file to backup');
    }
    
    // Write new rankings
    await fs.writeFile(path.join(process.cwd(), 'rankings.json'), JSON.stringify(results, null, 2));
    console.log('✅ rankings.json updated');
    
    const summary = Object.entries(results).map(([pos, data]) => 
      `${pos.toUpperCase()}: ${data.length}`
    ).join(', ');
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Rankings restored using simple HTTP scraping',
        totalPlayers,
        positions: summary,
        method: 'simple_fetch',
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('❌ Error in simple restore:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        method: 'simple_fetch'
      })
    };
  }
};