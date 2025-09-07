const fs = require('fs');
const path = require('path');

/**
 * Compare two ranking datasets to analyze movement
 */
function compareRankings(week1Data, week2Data, position = 'all') {
  const comparison = {
    date: new Date().toISOString(),
    positions: {},
    summary: {
      totalPlayers: 0,
      playersRising: 0,
      playersFalling: 0,
      playersStable: 0,
      newPlayers: 0,
      droppedPlayers: 0
    }
  };

  const positions = position === 'all' ? ['qb', 'rb', 'wr', 'te', 'flex'] : [position];

  positions.forEach(pos => {
    if (week1Data[pos] && week2Data[pos]) {
      comparison.positions[pos] = comparePosition(week1Data[pos], week2Data[pos]);
      
      // Update summary
      comparison.summary.totalPlayers += comparison.positions[pos].movements.length;
      comparison.summary.playersRising += comparison.positions[pos].stats.rising;
      comparison.summary.playersFalling += comparison.positions[pos].stats.falling;
      comparison.summary.playersStable += comparison.positions[pos].stats.stable;
      comparison.summary.newPlayers += comparison.positions[pos].stats.new;
      comparison.summary.droppedPlayers += comparison.positions[pos].stats.dropped;
    }
  });

  return comparison;
}

function comparePosition(week1Players, week2Players) {
  const week1Map = new Map(week1Players.map(p => [p.player, p.preGameRank]));
  const week2Map = new Map(week2Players.map(p => [p.player, p.preGameRank]));
  
  const movements = [];
  const stats = { rising: 0, falling: 0, stable: 0, new: 0, dropped: 0 };

  // Analyze players in week2
  week2Players.forEach(player => {
    const oldRank = week1Map.get(player.player);
    const newRank = player.preGameRank;
    
    if (oldRank === undefined) {
      movements.push({
        player: player.player,
        status: 'new',
        newRank,
        movement: `New (${newRank})`
      });
      stats.new++;
    } else {
      const change = oldRank - newRank; // Positive = rank improved (moved up)
      
      if (change === 0) {
        stats.stable++;
      } else if (change > 0) {
        stats.rising++;
        movements.push({
          player: player.player,
          status: 'rising',
          oldRank,
          newRank,
          movement: `↑${change}`,
          change
        });
      } else {
        stats.falling++;
        movements.push({
          player: player.player,
          status: 'falling',
          oldRank,
          newRank,
          movement: `↓${Math.abs(change)}`,
          change
        });
      }
    }
  });

  // Find dropped players
  week1Players.forEach(player => {
    if (!week2Map.has(player.player)) {
      movements.push({
        player: player.player,
        status: 'dropped',
        oldRank: player.preGameRank,
        movement: `Dropped (was ${player.preGameRank})`
      });
      stats.dropped++;
    }
  });

  return { movements, stats };
}

/**
 * Generate CSV export for analysis
 */
function exportToCSV(data, type = 'rankings') {
  switch(type) {
    case 'rankings':
      return exportRankingsCSV(data);
    case 'comparison':
      return exportComparisonCSV(data);
    case 'movements':
      return exportMovementsCSV(data);
    default:
      throw new Error(`Unknown export type: ${type}`);
  }
}

function exportRankingsCSV(rankingsData) {
  const positions = ['qb', 'rb', 'wr', 'te'];
  let csv = 'Position,Rank,Player,Opponent\n';
  
  positions.forEach(pos => {
    if (rankingsData[pos]) {
      rankingsData[pos].forEach(player => {
        csv += `${pos.toUpperCase()},${player.preGameRank},"${player.player}","${player.opponent}"\n`;
      });
    }
  });
  
  return csv;
}

function exportComparisonCSV(comparisonData) {
  let csv = 'Position,Player,Status,Old_Rank,New_Rank,Movement,Change\n';
  
  Object.keys(comparisonData.positions).forEach(pos => {
    comparisonData.positions[pos].movements.forEach(movement => {
      csv += `${pos.toUpperCase()},"${movement.player}",${movement.status},${movement.oldRank || ''},${movement.newRank || ''},"${movement.movement}",${movement.change || ''}\n`;
    });
  });
  
  return csv;
}

function exportMovementsCSV(movementsData) {
  let csv = 'Player,Position,Week_1_Rank,Week_2_Rank,Movement,Change_Type\n';
  
  movementsData.forEach(movement => {
    csv += `"${movement.player}",${movement.position},${movement.week1Rank || ''},${movement.week2Rank || ''},"${movement.movement}",${movement.type}\n`;
  });
  
  return csv;
}

/**
 * Calculate accuracy metrics (for future use with actual game results)
 */
function calculateAccuracyMetrics(predictedRankings, actualResults) {
  // Placeholder for future implementation when actual game results are integrated
  return {
    topPicksAccuracy: 0, // How often top 10 picks performed well
    busts: [], // High-ranked players who performed poorly
    sleepers: [], // Low-ranked players who performed well
    overallCorrelation: 0 // Statistical correlation between ranking and performance
  };
}

/**
 * Save analysis results
 */
function saveAnalysis(analysisData, filename) {
  const analysisDir = path.join(__dirname, 'data', 'analysis');
  const filePath = path.join(analysisDir, filename);
  
  fs.writeFileSync(filePath, JSON.stringify(analysisData, null, 2));
  console.log(`Analysis saved to: ${filePath}`);
}

module.exports = {
  compareRankings,
  exportToCSV,
  calculateAccuracyMetrics,
  saveAnalysis
};