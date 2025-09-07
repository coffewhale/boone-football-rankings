const fs = require('fs');
const path = require('path');

/**
 * Convert CSV file to final-results.json format
 * CSV should have columns: Player,Position,Fantasy_Points
 * Optional: Team,Opponent for additional data
 */

function csvToResults(csvFilePath, week, year = 2025) {
  try {
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Find required column indices
    const playerIndex = findColumnIndex(headers, ['Player', 'Name', 'player', 'name']);
    const positionIndex = findColumnIndex(headers, ['Position', 'Pos', 'position', 'pos']);
    const pointsIndex = findColumnIndex(headers, ['Fantasy_Points', 'Points', 'fantasy_points', 'points', 'Pts', 'pts']);
    
    if (playerIndex === -1 || pointsIndex === -1) {
      throw new Error('CSV must have Player and Fantasy_Points columns');
    }

    const players = [];
    
    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
      
      if (row.length < Math.max(playerIndex, pointsIndex) + 1) continue;
      
      const player = {
        name: row[playerIndex],
        position: positionIndex !== -1 ? row[positionIndex].toUpperCase() : 'UNKNOWN',
        fantasyPoints: parseFloat(row[pointsIndex]) || 0
      };
      
      if (player.name && !isNaN(player.fantasyPoints)) {
        players.push(player);
      }
    }
    
    // Sort by fantasy points to determine actual ranks
    players.sort((a, b) => b.fantasyPoints - a.fantasyPoints);
    players.forEach((player, index) => {
      player.actualRank = index + 1;
    });
    
    // Load pre-game rankings to match up players
    const preGameRankings = loadPreGameRankings(week, year);
    
    // Build final results structure
    const results = {
      week: parseInt(week),
      year: parseInt(year),
      scoring: "Half PPR", 
      timestamp: new Date().toISOString(),
      players: {},
      metadata: {
        totalPlayersTracked: players.length,
        dataSource: "CSV Import",
        csvFile: path.basename(csvFilePath),
        lastUpdated: new Date().toISOString()
      }
    };
    
    // Match players with pre-game rankings
    players.forEach(player => {
      const preGameData = findPlayerInRankings(player.name, preGameRankings);
      
      results.players[player.name] = {
        position: player.position,
        fantasyPoints: player.fantasyPoints,
        actualRank: player.actualRank,
        preGameRank: preGameData ? preGameData.preGameRank : null,
        opponent: preGameData ? preGameData.opponent : null
      };
    });
    
    return results;
    
  } catch (error) {
    throw new Error(`Failed to process CSV: ${error.message}`);
  }
}

function findColumnIndex(headers, possibleNames) {
  for (let name of possibleNames) {
    const index = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
    if (index !== -1) return index;
  }
  return -1;
}

function loadPreGameRankings(week, year) {
  try {
    const snapshotPath = path.join(__dirname, 'data', 'snapshots', year.toString(), `week-${week}.json`);
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    return snapshot.data;
  } catch (error) {
    console.warn(`Could not load pre-game rankings for Week ${week}, ${year}`);
    return null;
  }
}

function findPlayerInRankings(playerName, rankings) {
  if (!rankings) return null;
  
  const positions = ['qb', 'rb', 'wr', 'te', 'flex'];
  
  for (let pos of positions) {
    if (rankings[pos]) {
      const found = rankings[pos].find(p => 
        p.player.toLowerCase().includes(playerName.toLowerCase()) ||
        playerName.toLowerCase().includes(p.player.toLowerCase())
      );
      if (found) {
        return {
          preGameRank: found.preGameRank,
          opponent: found.opponent
        };
      }
    }
  }
  
  return null;
}

function saveResults(results, outputPath = null) {
  if (!outputPath) {
    outputPath = path.join(__dirname, 'data', 'analysis', `final-results-week-${results.week}-${results.year}.json`);
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`✅ Results saved to: ${outputPath}`);
  return outputPath;
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node csv-to-results.js <csv-file> <week> [year]');
    console.log('Example: node csv-to-results.js week1-results.csv 1 2025');
    process.exit(1);
  }
  
  const [csvFile, week, year = 2025] = args;
  
  try {
    const results = csvToResults(csvFile, week, year);
    const outputPath = saveResults(results);
    
    console.log('\n📊 Conversion Summary:');
    console.log(`- Players processed: ${results.metadata.totalPlayersTracked}`);
    console.log(`- Week: ${results.week}`);
    console.log(`- Output: ${outputPath}`);
    
    // Show top 5 performers
    const topPerformers = Object.entries(results.players)
      .sort(([,a], [,b]) => b.fantasyPoints - a.fantasyPoints)
      .slice(0, 5);
      
    console.log('\n🏆 Top 5 Performers:');
    topPerformers.forEach(([name, data], i) => {
      console.log(`${i + 1}. ${name}: ${data.fantasyPoints} pts`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

module.exports = { csvToResults, saveResults };