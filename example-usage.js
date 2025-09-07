/**
 * Example usage of the analysis infrastructure
 * Run these commands to test the system
 */

const { saveWeeklySnapshot, getAvailableSnapshots, loadSnapshot } = require('./snapshot-utility');
const { compareRankings, exportToCSV } = require('./analysis-utils');

// Example 1: Save current rankings as Week 1 snapshot
console.log('📁 Saving current rankings as Week 1 snapshot...');
const saved = saveWeeklySnapshot(1, 2025);
if (saved) {
  console.log('✅ Snapshot saved successfully!');
}

// Example 2: List all available snapshots
console.log('\n📋 Available snapshots:');
const snapshots = getAvailableSnapshots();
snapshots.forEach(snapshot => {
  console.log(`  - Week ${snapshot.week}, ${snapshot.year} (${new Date(snapshot.timestamp).toLocaleDateString()})`);
});

// Example 3: Export current rankings to CSV
console.log('\n📊 Exporting current rankings to CSV...');
const fs = require('fs');
const currentRankings = JSON.parse(fs.readFileSync('./rankings.json', 'utf8'));
const csvData = exportToCSV(currentRankings, 'rankings');
fs.writeFileSync('./current-rankings.csv', csvData);
console.log('✅ CSV exported to current-rankings.csv');

// Example 4: Compare two weeks (when you have multiple snapshots)
/*
if (snapshots.length >= 2) {
  console.log('\n🔄 Comparing Week 1 vs Week 2...');
  const week1 = loadSnapshot(1, 2025);
  const week2 = loadSnapshot(2, 2025);
  const comparison = compareRankings(week1.data, week2.data);
  
  console.log('📈 Summary:');
  console.log(`  - Players rising: ${comparison.summary.playersRising}`);
  console.log(`  - Players falling: ${comparison.summary.playersFalling}`);
  console.log(`  - New players: ${comparison.summary.newPlayers}`);
  
  // Export comparison to CSV
  const comparisonCSV = exportToCSV(comparison, 'comparison');
  fs.writeFileSync('./week-comparison.csv', comparisonCSV);
  console.log('✅ Comparison exported to week-comparison.csv');
}
*/

console.log('\n🚀 Infrastructure ready! Follow the updated WORKFLOW.md for weekly updates.');