const { handler: scrapeFantasyPros } = require('./fantasypros-rankings-scraper');

exports.handler = async (event, context) => {
  try {
    console.log('Starting Boone vs FantasyPros rankings comparison...');
    
    const { position = 'qb' } = event.queryStringParameters || {};
    
    console.log(`Comparing ${position.toUpperCase()} rankings`);
    
    // Step 1: Get live Boone rankings
    console.log('Fetching live Boone rankings...');
    const booneResponse = await fetch('https://boone-football-rankings.netlify.app/rankings.json');
    const booneData = await booneResponse.json();
    const booneRankings = booneData[position.toLowerCase()] || [];
    
    console.log(`Found ${booneRankings.length} Boone ${position.toUpperCase()} rankings`);
    
    if (booneRankings.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: `No Boone rankings found for ${position.toUpperCase()}. Available positions: ${Object.keys(booneData).filter(pos => booneData[pos].length > 0).join(', ')}`
        })
      };
    }
    
    // Step 2: Scrape FantasyPros expert rankings
    console.log('Scraping FantasyPros expert rankings...');
    const fantasyProsScrapeEvent = {
      queryStringParameters: { position }
    };
    
    const fantasyProsResult = await scrapeFantasyPros(fantasyProsScrapeEvent, context);
    const fantasyProsData = JSON.parse(fantasyProsResult.body);
    
    if (!fantasyProsData.success) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Failed to scrape FantasyPros expert rankings',
          details: fantasyProsData.error
        })
      };
    }
    
    const expertRankings = fantasyProsData.data || [];
    console.log(`Found ${expertRankings.length} FantasyPros expert rankings`);
    
    // Step 3: Perform comparison analysis
    const analysis = compareRankings(booneRankings, expertRankings, position);
    
    // Step 4: Generate comparison report
    const report = generateComparisonReport(analysis, position);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        position: position.toUpperCase(),
        analysis,
        report,
        metadata: {
          boonePlayersCount: booneRankings.length,
          expertPlayersCount: expertRankings.length,
          comparedAt: new Date().toISOString(),
          comparisonType: 'boone_vs_fantasypros_experts'
        }
      })
    };
    
  } catch (error) {
    console.error('Error in rankings comparison:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Failed to perform rankings comparison',
        details: error.message
      })
    };
  }
};

function compareRankings(booneRankings, expertRankings, position) {
  const comparisons = [];
  const booneOnly = [];
  const expertsOnly = [];
  
  // Create lookup maps
  const booneMap = new Map();
  booneRankings.forEach(player => {
    booneMap.set(normalizePlayerName(player.player), {
      rank: player.preGameRank,
      opponent: player.opponent || 'N/A'
    });
  });
  
  const expertMap = new Map();
  expertRankings.forEach(player => {
    expertMap.set(normalizePlayerName(player.player), {
      rank: player.rank
    });
  });
  
  // Compare each player in Boone's rankings
  for (const [playerName, booneData] of booneMap) {
    const expertData = expertMap.get(playerName);
    
    if (expertData) {
      const rankDifference = expertData.rank - booneData.rank;
      const accuracy = Math.abs(rankDifference);
      
      comparisons.push({
        player: playerName,
        booneRank: booneData.rank,
        expertRank: expertData.rank,
        rankDifference,
        accuracy,
        opponent: booneData.opponent,
        category: categorizeAccuracy(accuracy),
        agreement: rankDifference === 0 ? 'perfect' : 
                  (rankDifference > 0 ? 'boone_higher' : 'boone_lower')
      });
    } else {
      booneOnly.push({
        player: playerName,
        booneRank: booneData.rank,
        opponent: booneData.opponent,
        reason: 'not_in_expert_consensus'
      });
    }
  }
  
  // Find players ranked by experts but not by Boone
  for (const [playerName, expertData] of expertMap) {
    if (!booneMap.has(playerName) && expertData.rank <= 30) { // Only show top 30
      expertsOnly.push({
        player: playerName,
        expertRank: expertData.rank,
        reason: 'not_ranked_by_boone'
      });
    }
  }
  
  // Calculate overall agreement metrics
  const validComparisons = comparisons.filter(c => c.accuracy !== undefined);
  const avgAccuracy = validComparisons.reduce((sum, c) => sum + c.accuracy, 0) / validComparisons.length;
  const perfectMatches = validComparisons.filter(c => c.accuracy === 0).length;
  const closeMatches = validComparisons.filter(c => c.accuracy <= 3).length;
  const significantDifferences = validComparisons.filter(c => c.accuracy > 10).length;
  
  return {
    comparisons: comparisons.sort((a, b) => a.booneRank - b.booneRank),
    booneOnly: booneOnly.sort((a, b) => a.booneRank - b.booneRank),
    expertsOnly: expertsOnly.sort((a, b) => a.expertRank - b.expertRank),
    metrics: {
      totalComparisons: validComparisons.length,
      averageAccuracy: Math.round(avgAccuracy * 100) / 100,
      perfectMatches,
      closeMatches: `${closeMatches}/${validComparisons.length}`,
      significantDifferences,
      agreementPercentage: Math.round((closeMatches / validComparisons.length) * 100)
    }
  };
}

function normalizePlayerName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*(jr|sr|ii|iii|iv)\s*$/, ''); // Remove suffixes
}

function categorizeAccuracy(accuracy) {
  if (accuracy === 0) return 'perfect';
  if (accuracy <= 3) return 'close';
  if (accuracy <= 7) return 'moderate';
  if (accuracy <= 15) return 'significant';
  return 'major';
}

function generateComparisonReport(analysis, position) {
  const { comparisons, metrics, booneOnly, expertsOnly } = analysis;
  
  const report = {
    summary: `${position.toUpperCase()} Rankings: ${metrics.agreementPercentage}% agreement (within 3 spots) with ${metrics.perfectMatches} perfect matches`,
    
    highlights: [],
    
    concerns: [],
    
    strongAgreements: comparisons
      .filter(c => c.accuracy <= 1)
      .slice(0, 5)
      .map(c => `${c.player} (Boone #${c.booneRank}, Experts #${c.expertRank})`),
    
    biggestDisagreements: comparisons
      .filter(c => c.accuracy > 10)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5)
      .map(c => `${c.player} (Boone #${c.booneRank}, Experts #${c.expertRank}, ${c.accuracy} spots different)`),
    
    booneUnique: booneOnly
      .slice(0, 5)
      .map(p => `${p.player} (Boone #${p.booneRank}, not in expert consensus)`),
      
    expertUnique: expertsOnly
      .slice(0, 5)  
      .map(p => `${p.player} (Expert consensus #${p.expertRank}, not ranked by Boone)`)
  };
  
  // Add highlights based on agreement
  if (metrics.perfectMatches > 0) {
    report.highlights.push(`${metrics.perfectMatches} players ranked identically by both`);
  }
  
  if (metrics.agreementPercentage > 70) {
    report.highlights.push(`Strong overall agreement at ${metrics.agreementPercentage}%`);
  }
  
  // Add concerns
  if (metrics.agreementPercentage < 50) {
    report.concerns.push(`Low agreement rate at ${metrics.agreementPercentage}%`);
  }
  
  if (metrics.significantDifferences > 3) {
    report.concerns.push(`${metrics.significantDifferences} players with major ranking differences (>10 spots)`);
  }
  
  if (booneOnly.length > 5) {
    report.concerns.push(`${booneOnly.length} players ranked by Boone but not in expert consensus`);
  }
  
  return report;
}