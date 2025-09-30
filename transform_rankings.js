// Script to transform all_rankings_combined.json to rankings.json format

const fs = require('fs');

// Read the combined rankings file
const combinedData = JSON.parse(fs.readFileSync('./all_rankings_combined.json', 'utf8'));

// Transform the data
const transformedData = {
  lastUpdated: new Date().toISOString(),
  week: combinedData.summary.week,
  qb: [],
  rb: [],
  wr: [],
  te: [],
  flex: [],
  def: [],
  k: []
};

// Map positions from combined to output format
const positionMap = {
  QB: 'qb',
  RB: 'rb',
  WR: 'wr',
  TE: 'te',
  FLEX: 'flex',
  DST: 'def',
  K: 'k'
};

// Transform each position
for (const [sourcePos, targetPos] of Object.entries(positionMap)) {
  const players = combinedData.rankings[sourcePos] || [];

  if (targetPos === 'flex') {
    // Special handling for FLEX - include position rank
    transformedData[targetPos] = players.map(player => ({
      preGameRank: player.rank,
      player: player.name,
      opponent: player.opponent,
      positionRank: player.position // This is like "RB1", "WR2", "TE1"
    }));
  } else if (targetPos === 'def') {
    // Defense/Special Teams
    transformedData[targetPos] = players.map(player => ({
      preGameRank: player.rank,
      player: player.name,
      opponent: player.opponent
    }));
  } else {
    // Regular positions (QB, RB, WR, TE, K)
    transformedData[targetPos] = players.map(player => ({
      preGameRank: player.rank,
      player: player.name,
      opponent: player.opponent
    }));
  }
}

// Write the transformed data
fs.writeFileSync('./rankings.json', JSON.stringify(transformedData, null, 2));
console.log('✅ Successfully transformed rankings!');
console.log(`📊 Total players: ${combinedData.summary.total_players}`);
console.log(`📅 Week: ${combinedData.summary.week}`);
console.log(`🏈 Rankings type: ${combinedData.summary.rankings_type}`);
