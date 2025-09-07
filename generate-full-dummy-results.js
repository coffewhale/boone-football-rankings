const fs = require('fs');

/**
 * Generate comprehensive dummy CSV with ALL players from current rankings
 */

// Read current rankings
const rankings = JSON.parse(fs.readFileSync('./rankings.json', 'utf8'));

console.log('🎲 Generating comprehensive dummy results...');

let csvData = 'Player,Position,Fantasy_Points,Team,Opponent\n';
let allPlayers = [];

// Process all positions
const positions = ['qb', 'rb', 'wr', 'te', 'def', 'k'];

positions.forEach(pos => {
  if (rankings[pos]) {
    rankings[pos].forEach(player => {
      // Generate realistic fantasy points based on position and rank
      const points = generateFantasyPoints(pos, player.preGameRank);
      
      allPlayers.push({
        name: player.player,
        position: pos.toUpperCase(),
        points: points,
        opponent: player.opponent,
        preGameRank: player.preGameRank
      });
      
      // Extract team from opponent (vs DAL -> DAL, @ BUF -> BUF)
      const team = extractOpponentTeam(player.opponent);
      
      csvData += `"${player.player}",${pos.toUpperCase()},${points},"${team}","${player.opponent}"\n`;
    });
    
    console.log(`✅ ${pos.toUpperCase()}: ${rankings[pos].length} players`);
  }
});

// Write CSV file
fs.writeFileSync('./all-players-dummy-results.csv', csvData);

console.log(`\n🎉 Generated dummy results for ${allPlayers.length} players`);
console.log('📁 Saved as: all-players-dummy-results.csv');

// Show some stats
const qbPoints = allPlayers.filter(p => p.position === 'QB').map(p => p.points);
const rbPoints = allPlayers.filter(p => p.position === 'RB').map(p => p.points);
const wrPoints = allPlayers.filter(p => p.position === 'WR').map(p => p.points);

console.log('\n📊 Sample Fantasy Points Generated:');
console.log(`QB Range: ${Math.min(...qbPoints).toFixed(1)} - ${Math.max(...qbPoints).toFixed(1)}`);
console.log(`RB Range: ${Math.min(...rbPoints).toFixed(1)} - ${Math.max(...rbPoints).toFixed(1)}`);  
console.log(`WR Range: ${Math.min(...wrPoints).toFixed(1)} - ${Math.max(...wrPoints).toFixed(1)}`);

console.log('\n🚀 Now run: node csv-to-results.js all-players-dummy-results.csv 1');

function generateFantasyPoints(position, rank) {
  let basePoints, variance;
  
  // Base points by position (realistic averages)
  switch(position.toLowerCase()) {
    case 'qb':
      basePoints = 20;
      variance = 12;
      break;
    case 'rb':
      basePoints = 14;
      variance = 12;
      break;
    case 'wr':
      basePoints = 12;
      variance = 10;
      break;
    case 'te':
      basePoints = 9;
      variance = 8;
      break;
    case 'def':
      basePoints = 8;
      variance = 8;
      break;
    case 'k':
      basePoints = 7;
      variance = 5;
      break;
    default:
      basePoints = 10;
      variance = 8;
  }
  
  // Higher ranked players tend to score more, but with realistic variance
  const rankBonus = Math.max(0, (50 - rank) / 8);
  
  // Add some chaos - fantasy football is unpredictable!
  const chaos = (Math.random() - 0.5) * variance * 1.5;
  
  // Occasional bust (high rank, low score) or boom (low rank, high score)
  let multiplier = 1;
  if (Math.random() < 0.1) { // 10% chance of major variance
    multiplier = Math.random() < 0.5 ? 0.5 : 1.8; // Bust or boom
  }
  
  let finalPoints = (basePoints + rankBonus + chaos) * multiplier;
  
  // Ensure minimum realistic score (except for complete busts)
  finalPoints = Math.max(multiplier < 0.7 ? 0 : 2, finalPoints);
  
  return Math.round(finalPoints * 10) / 10; // Round to 1 decimal
}

function extractOpponentTeam(opponent) {
  // "vs DAL" -> "DAL", "@ BUF" -> "BUF"
  return opponent.replace(/^(vs|@)\s+/, '');
}