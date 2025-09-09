const { chromium } = require('playwright-chromium');

exports.handler = async (event, context) => {
  let browser;
  
  try {
    console.log('Starting FantasyPros rankings scraper...');
    
    // Parse query parameters
    const { position = 'qb' } = event.queryStringParameters || {};
    
    // Map positions to FantasyPros URLs
    const urlMap = {
      'qb': 'https://www.fantasypros.com/nfl/rankings/qb.php',
      'rb': 'https://www.fantasypros.com/nfl/rankings/half-point-ppr-rb.php',
      'wr': 'https://www.fantasypros.com/nfl/rankings/half-point-ppr-wr.php',
      'te': 'https://www.fantasypros.com/nfl/rankings/half-point-ppr-te.php',
      'flex': 'https://www.fantasypros.com/nfl/rankings/half-point-ppr-flex.php',
      'k': 'https://www.fantasypros.com/nfl/rankings/k.php',
      'def': 'https://www.fantasypros.com/nfl/rankings/dst.php'
    };
    
    const url = urlMap[position.toLowerCase()];
    if (!url) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: `Invalid position: ${position}. Valid positions: ${Object.keys(urlMap).join(', ')}`
        })
      };
    }
    
    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    
    console.log(`Scraping FantasyPros rankings for ${position.toUpperCase()}: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    
    let playerData = [];
    
    // Try different table selectors for FantasyPros rankings
    const selectors = [
      'table#ranking-table tbody tr',
      '.ranking-table tbody tr',
      'table.table tbody tr',
      '#data tbody tr',
      'tbody tr'
    ];
    
    for (const selector of selectors) {
      try {
        console.log(`Trying selector: ${selector}`);
        
        const rows = await page.$$(selector);
        if (rows.length > 0) {
          console.log(`Found ${rows.length} rows with selector: ${selector}`);
          
          for (let i = 0; i < Math.min(rows.length, 50); i++) { // Limit to top 50
            const row = rows[i];
            try {
              const cells = await row.$$('td, th');
              if (cells.length >= 2) {
                const cellTexts = await Promise.all(
                  cells.map(cell => cell.textContent())
                );
                
                // Clean cell texts
                const cleanCells = cellTexts.map(text => text ? text.trim() : '');
                
                // Look for rank and player name
                let rank = null;
                let playerName = null;
                
                // First cell is often the rank
                if (cleanCells[0] && cleanCells[0].match(/^\\d+$/)) {
                  rank = parseInt(cleanCells[0]);
                }
                
                // Look for player name in subsequent cells
                for (let j = 1; j < cleanCells.length && !playerName; j++) {
                  const cell = cleanCells[j];
                  if (cell && 
                      cell.length > 2 && 
                      !cell.match(/^\\d+(\\.\\d+)?$/) && // Not just numbers
                      !cell.toLowerCase().includes('week') &&
                      !cell.toLowerCase().includes('rank') &&
                      !cell.toLowerCase().includes('team') &&
                      cell !== position.toUpperCase()) {
                    playerName = cell;
                    break;
                  }
                }
                
                // If no explicit rank found, use position in array
                if (!rank) rank = i + 1;
                
                if (playerName && rank) {
                  playerData.push({
                    rank: rank,
                    player: playerName.trim(),
                    position: position.toUpperCase(),
                    source: 'fantasypros_rankings'
                  });
                }
              }
            } catch (rowError) {
              console.log(`Error processing row ${i}:`, rowError.message);
            }
          }
          
          if (playerData.length > 0) {
            break; // Found data, stop trying other selectors
          }
        }
      } catch (selectorError) {
        console.log(`Selector ${selector} failed:`, selectorError.message);
      }
    }
    
    // Sort by rank and ensure consecutive ranking
    playerData.sort((a, b) => a.rank - b.rank);
    playerData = playerData.map((player, index) => ({
      ...player,
      rank: index + 1 // Ensure consecutive ranking
    }));
    
    const pageTitle = await page.title();
    console.log(`Scraped ${playerData.length} ${position.toUpperCase()} rankings from FantasyPros`);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        position: position.toUpperCase(),
        playersFound: playerData.length,
        pageTitle,
        url,
        data: playerData
      })
    };
    
  } catch (error) {
    console.error('Error scraping FantasyPros rankings:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Failed to scrape FantasyPros rankings',
        details: error.message
      })
    };
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};