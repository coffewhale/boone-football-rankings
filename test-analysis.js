/**
 * Test the analysis system with dummy data
 */

const { saveWeeklySnapshot, loadSnapshot } = require('./snapshot-utility');
const { compareRankings, exportToCSV } = require('./analysis-utils');
const ResultsFetcher = require('./results-fetcher');
const fs = require('fs');

console.log('🧪 Testing Analysis System with Dummy Data\n');

async function runTest() {
  try {
    // Step 1: Save current rankings as Week 1 snapshot
    console.log('📁 Step 1: Saving current rankings as Week 1 snapshot...');
    const saved = saveWeeklySnapshot(1, 2025);
    if (!saved) {
      console.error('❌ Failed to save snapshot');
      return;
    }
    console.log('✅ Week 1 snapshot saved\n');

    // Step 2: Load the snapshot
    console.log('📂 Step 2: Loading Week 1 snapshot...');
    const week1Snapshot = loadSnapshot(1, 2025);
    console.log(`✅ Loaded snapshot with ${Object.keys(week1Snapshot.data).length} position groups\n`);

    // Step 3: Generate dummy final results
    console.log('🎲 Step 3: Generating dummy final results...');
    const fetcher = new ResultsFetcher();
    const finalResults = fetcher.generateDummyResults(week1Snapshot);
    
    // Save the dummy results
    const resultsPath = fetcher.saveResults(finalResults, 'final-results-test.json');
    console.log(`✅ Dummy results generated with ${finalResults.metadata.totalPlayersTracked} players\n`);

    // Step 4: Calculate accuracy metrics
    console.log('📊 Step 4: Calculating accuracy metrics...');
    const accuracy = calculateAccuracy(week1Snapshot.data, finalResults);
    console.log('✅ Accuracy analysis complete\n');

    // Step 5: Export data to CSV
    console.log('📋 Step 5: Exporting to CSV...');
    
    // Export original rankings
    const rankingsCSV = exportToCSV(week1Snapshot.data, 'rankings');
    fs.writeFileSync('./test-rankings.csv', rankingsCSV);
    console.log('✅ Rankings exported to test-rankings.csv');

    // Export accuracy analysis
    const accuracyCSV = exportAccuracyCSV(accuracy);
    fs.writeFileSync('./test-accuracy.csv', accuracyCSV);
    console.log('✅ Accuracy analysis exported to test-accuracy.csv\n');

    // Step 6: Display summary
    console.log('📈 SUMMARY RESULTS:');
    console.log('='.repeat(50));
    console.log(`Total Players Analyzed: ${accuracy.totalPlayers}`);
    console.log(`Top 10 Accuracy: ${accuracy.top10Accuracy.toFixed(1)}%`);
    console.log(`Biggest Bust: ${accuracy.biggestBust.name} (Ranked ${accuracy.biggestBust.preGameRank}, Scored ${accuracy.biggestBust.fantasyPoints} pts)`);
    console.log(`Biggest Sleeper: ${accuracy.biggestSleeper.name} (Ranked ${accuracy.biggestSleeper.preGameRank}, Scored ${accuracy.biggestSleeper.fantasyPoints} pts)`);
    console.log(`\n🚀 Test complete! Check the CSV files for detailed analysis.`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function calculateAccuracy(rankings, results) {
  const analysis = {
    totalPlayers: 0,
    top10Accuracy: 0,
    top20Accuracy: 0,
    biggestBust: null,
    biggestSleeper: null,
    positionAccuracy: {}
  };

  const positions = ['qb', 'rb', 'wr', 'te'];
  let allPlayers = [];

  // Collect all players with their results
  positions.forEach(pos => {
    if (rankings[pos]) {
      rankings[pos].forEach(player => {
        const result = results.players[player.player];
        if (result) {
          allPlayers.push({
            name: player.player,
            position: pos.toUpperCase(),
            preGameRank: player.preGameRank,
            fantasyPoints: result.fantasyPoints,
            actualRank: result.actualRank,
            rankDiff: player.preGameRank - result.actualRank // Positive = overperformed
          });
        }
      });
    }
  });

  analysis.totalPlayers = allPlayers.length;

  // Calculate top 10/20 accuracy
  const top10Players = allPlayers.filter(p => p.preGameRank <= 10);
  const top10Success = top10Players.filter(p => p.actualRank <= 15).length; // Within 5 spots
  analysis.top10Accuracy = (top10Success / top10Players.length) * 100;

  const top20Players = allPlayers.filter(p => p.preGameRank <= 20);
  const top20Success = top20Players.filter(p => p.actualRank <= 30).length;
  analysis.top20Accuracy = (top20Success / top20Players.length) * 100;

  // Find biggest bust (high rank, low performance)
  const highRankedPlayers = allPlayers.filter(p => p.preGameRank <= 20);
  analysis.biggestBust = highRankedPlayers.reduce((bust, player) => {
    const bustScore = player.preGameRank - player.actualRank; // More negative = bigger bust
    const currentBustScore = bust ? bust.preGameRank - bust.actualRank : 0;
    return bustScore < currentBustScore ? player : bust;
  }, null);

  // Find biggest sleeper (low rank, high performance)  
  const lowRankedPlayers = allPlayers.filter(p => p.preGameRank > 30);
  analysis.biggestSleeper = lowRankedPlayers.reduce((sleeper, player) => {
    const sleeperScore = player.preGameRank - player.actualRank; // More positive = bigger sleeper
    const currentSleeperScore = sleeper ? sleeper.preGameRank - sleeper.actualRank : 0;
    return sleeperScore > currentSleeperScore ? player : sleeper;
  }, null);

  return analysis;
}

function exportAccuracyCSV(accuracy) {
  let csv = 'Player,Position,Pre_Game_Rank,Fantasy_Points,Actual_Rank,Rank_Difference,Performance\n';
  
  // This would need the full player data - simplified for demo
  csv += `Summary,,,,,,\n`;
  csv += `Total Players,${accuracy.totalPlayers},,,,\n`;
  csv += `Top 10 Accuracy,${accuracy.top10Accuracy.toFixed(1)}%,,,,\n`;
  
  return csv;
}

// Run the test
runTest();