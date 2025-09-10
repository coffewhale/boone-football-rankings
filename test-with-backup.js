#!/usr/bin/env node

// Test analysis with the backup rankings file
const { chromium } = require('playwright-chromium');
const fs = require('fs').promises;
const path = require('path');

// Function to normalize rankings data structure
function normalizeRankingsData(rawData) {
    const normalized = {};
    
    // Handle different data structures
    const positions = {
        'qb': 'QB',
        'rb': 'RB', 
        'wr': 'WR',
        'te': 'TE',
        'k': 'K',
        'def': 'DEF'
    };
    
    Object.entries(positions).forEach(([key, position]) => {
        const positionData = rawData[key] || rawData[position] || [];
        
        normalized[position] = positionData.map((player, index) => ({
            name: player.player || player.name || 'Unknown Player',
            rank: player.preGameRank || index + 1,
            opponent: player.opponent || '',
            team: player.team || ''
        }));
    });
    
    return normalized;
}

async function scrapeFantasyProsResults(week = '1') {
    console.log(`🏈 Scraping FantasyPros actual results for week ${week}...`);
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    
    const results = {};
    const positions = {
        'QB': 'qb',
        'RB': 'rb', 
        'WR': 'wr',
        'TE': 'te',
        'K': 'k',
        'DEF': 'dst'
    };
    
    for (const [position, urlPosition] of Object.entries(positions)) {
        console.log(`📊 Scraping ${position}...`);
        
        const url = `https://www.fantasypros.com/nfl/reports/leaders/${urlPosition}.php?year=2025&start=${week}&end=${week}`;
        
        try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            
            // Wait for the data table to load
            await page.waitForSelector('#data', { timeout: 10000 });
            
            const playerData = await page.evaluate(() => {
                const rows = document.querySelectorAll('#data tbody tr');
                const players = [];
                
                rows.forEach((row, index) => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 2) {
                        const playerLink = cells[1].querySelector('a');
                        if (playerLink) {
                            const playerName = playerLink.textContent.trim();
                            const team = cells[1].querySelector('small')?.textContent.trim() || '';
                            
                            // Get fantasy points (usually the last meaningful column)
                            let fantasyPoints = 0;
                            const pointsCell = cells[cells.length - 1];
                            if (pointsCell) {
                                const points = parseFloat(pointsCell.textContent.trim());
                                if (!isNaN(points)) {
                                    fantasyPoints = points;
                                }
                            }
                            
                            players.push({
                                rank: index + 1,
                                name: playerName,
                                team: team,
                                fantasyPoints: fantasyPoints
                            });
                        }
                    }
                });
                
                return players;
            });
            
            results[position] = playerData;
            console.log(`✅ ${position}: Found ${playerData.length} players`);
            
            await page.waitForTimeout(2000);
            
        } catch (error) {
            console.error(`❌ Error scraping ${position}:`, error.message);
            results[position] = [];
        }
    }
    
    await browser.close();
    
    return {
        week: parseInt(week),
        scraped_at: new Date().toISOString(),
        source: 'fantasypros',
        data: results
    };
}

function compareAccuracy(predictions, actualResults) {
    console.log('🔍 Comparing predictions with actual results...');
    
    const analysis = {
        summary: {},
        detailed: {},
        topMisses: [],
        topHits: [],
        overall: { totalPlayers: 0, averageError: 0, positionsAnalyzed: 0 }
    };
    
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    let totalError = 0;
    let totalPlayers = 0;
    
    positions.forEach(position => {
        console.log(`\n🔍 Analyzing ${position}...`);
        
        const predictedPlayers = predictions[position] || [];
        const actualPlayers = actualResults.data?.[position] || [];
        
        console.log(`  Predicted: ${predictedPlayers.length} players`);
        console.log(`  Actual: ${actualPlayers.length} players`);
        
        if (predictedPlayers.length === 0 || actualPlayers.length === 0) {
            console.log(`  ⚠️ Skipping ${position} - insufficient data`);
            return;
        }
        
        const positionAnalysis = {
            totalPredicted: predictedPlayers.length,
            totalActual: actualPlayers.length,
            matched: 0,
            averageRankError: 0,
            topPerformers: [],
            bigMisses: [],
            allComparisons: []
        };
        
        let positionErrors = [];
        
        // Create lookup map for actual results
        const actualMap = new Map();
        actualPlayers.forEach(player => {
            const cleanName = cleanPlayerName(player.name);
            actualMap.set(cleanName, {
                actualRank: player.rank,
                fantasyPoints: player.fantasyPoints,
                ...player
            });
        });
        
        console.log(`  Created actual lookup map with ${actualMap.size} players`);
        
        // Compare predictions with actual
        predictedPlayers.forEach((predictedPlayer, predIndex) => {
            const cleanName = cleanPlayerName(predictedPlayer.name);
            const actualPlayer = actualMap.get(cleanName);
            
            const predictedRank = predIndex + 1;
            
            if (actualPlayer) {
                const actualRank = actualPlayer.actualRank;
                const rankError = Math.abs(predictedRank - actualRank);
                
                positionErrors.push(rankError);
                totalError += rankError;
                totalPlayers++;
                positionAnalysis.matched++;
                
                const comparison = {
                    name: predictedPlayer.name,
                    predicted_rank: predictedRank,
                    actual_rank: actualRank,
                    rank_error: rankError,
                    fantasy_points: actualPlayer.fantasyPoints
                };
                
                positionAnalysis.allComparisons.push(comparison);
                
                if (rankError >= 15) {
                    positionAnalysis.bigMisses.push(comparison);
                } else if (rankError <= 3) {
                    positionAnalysis.topPerformers.push(comparison);
                }
            } else {
                console.log(`    ⚠️ No match found for: ${predictedPlayer.name} (cleaned: ${cleanName})`);
            }
        });
        
        console.log(`  Matched ${positionAnalysis.matched} out of ${predictedPlayers.length} predictions`);
        
        if (positionErrors.length > 0) {
            positionAnalysis.averageRankError = positionErrors.reduce((a, b) => a + b, 0) / positionErrors.length;
            console.log(`  Average rank error: ${positionAnalysis.averageRankError.toFixed(2)}`);
        }
        
        analysis.detailed[position] = positionAnalysis;
        analysis.summary[position] = {
            matched: positionAnalysis.matched,
            averageError: Math.round(positionAnalysis.averageRankError * 10) / 10,
            accuracy: positionAnalysis.averageRankError <= 5 ? 'Excellent' : 
                     positionAnalysis.averageRankError <= 10 ? 'Good' : 'Needs Work'
        };
    });
    
    analysis.overall = {
        totalPlayers: totalPlayers,
        averageError: totalPlayers > 0 ? Math.round((totalError / totalPlayers) * 10) / 10 : 0,
        positionsAnalyzed: Object.keys(analysis.summary).length
    };
    
    // Collect top hits and misses
    Object.values(analysis.detailed).forEach(pos => {
        analysis.topHits.push(...pos.topPerformers);
        analysis.topMisses.push(...pos.bigMisses);
    });
    
    analysis.topHits = analysis.topHits.sort((a, b) => a.rank_error - b.rank_error).slice(0, 10);
    analysis.topMisses = analysis.topMisses.sort((a, b) => b.rank_error - a.rank_error).slice(0, 10);
    
    return analysis;
}

function cleanPlayerName(name) {
    return name.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const week = args[0] || '1';
    const backupFile = args[1] || './rankings.json.backup.20250908_103404';
    
    console.log(`\n🏈 Testing Justin Boone Analysis with Backup File\n`);
    console.log(`Week: ${week}`);
    console.log(`Backup file: ${backupFile}\n`);
    
    try {
        // Read backup rankings
        console.log('📖 Reading backup rankings...');
        const rawPredictions = JSON.parse(await fs.readFile(backupFile, 'utf8'));
        const predictions = normalizeRankingsData(rawPredictions);
        console.log('✅ Backup rankings loaded and normalized');
        
        // Show what we loaded
        Object.entries(predictions).forEach(([pos, players]) => {
            console.log(`  ${pos}: ${players.length} players`);
        });
        
        // For testing purposes, you can skip scraping and use dummy data
        console.log('\n🤖 Would you like to:');
        console.log('1. Scrape live FantasyPros data (takes 2-3 minutes)');
        console.log('2. Use dummy test data (instant)');
        
        // For now, let's scrape real data
        const actualResults = await scrapeFantasyProsResults(week);
        
        // Save the actual results
        const resultsFile = `./data/week${week}_actual_results_test.json`;
        await fs.mkdir('./data', { recursive: true });
        await fs.writeFile(resultsFile, JSON.stringify(actualResults, null, 2));
        console.log(`💾 Saved actual results to ${resultsFile}`);
        
        // Perform analysis
        console.log('\n🔬 Analyzing accuracy...');
        const analysis = compareAccuracy(predictions, actualResults);
        
        // Save the analysis
        const analysisFile = `./data/week${week}_analysis_test.json`;
        await fs.writeFile(analysisFile, JSON.stringify(analysis, null, 2));
        console.log(`💾 Saved analysis to ${analysisFile}`);
        
        // Print detailed summary
        console.log('\n📊 ANALYSIS SUMMARY');
        console.log('==================');
        console.log(`Total Players Analyzed: ${analysis.overall.totalPlayers}`);
        console.log(`Average Rank Error: ${analysis.overall.averageError}`);
        console.log(`Positions Analyzed: ${analysis.overall.positionsAnalyzed}`);
        
        console.log('\n📈 Position Breakdown:');
        Object.entries(analysis.summary).forEach(([pos, stats]) => {
            console.log(`${pos}: ${stats.averageError} avg error (${stats.accuracy}) - ${stats.matched} matched`);
        });
        
        if (analysis.topHits.length > 0) {
            console.log('\n🎯 Top 5 Predictions:');
            analysis.topHits.slice(0, 5).forEach(hit => {
                console.log(`  ${hit.name}: Predicted #${hit.predicted_rank}, Actual #${hit.actual_rank} (error: ${hit.rank_error})`);
            });
        }
        
        if (analysis.topMisses.length > 0) {
            console.log('\n❌ Biggest 5 Misses:');
            analysis.topMisses.slice(0, 5).forEach(miss => {
                console.log(`  ${miss.name}: Predicted #${miss.predicted_rank}, Actual #${miss.actual_rank} (error: ${miss.rank_error})`);
            });
        }
        
        console.log(`\n✅ Analysis complete! Check files in ./data/ folder for full details.`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}