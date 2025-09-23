#!/usr/bin/env node

// Script to manually update rankings from all_rankings_combined.json
const fs = require('fs').promises;
const path = require('path');

async function updateRankings() {
    console.log('🚀 Starting manual rankings update...\n');

    try {
        // Read the new combined rankings file
        const combinedPath = path.join(__dirname, 'all_rankings_combined.json');
        const combinedData = JSON.parse(await fs.readFile(combinedPath, 'utf8'));

        console.log(`📊 Found ${combinedData.summary.total_players} total players`);
        console.log('   Position counts:', combinedData.summary.position_counts);

        // Transform the data into the format expected by the website
        const transformedRankings = {
            qb: [],
            rb: [],
            wr: [],
            te: [],
            flex: [],
            def: [],
            k: [],
            lastUpdated: new Date('2025-09-23T17:42:00.000Z').toISOString(), // Sept 23, 2025 at 12:42 PM CDT
            week: '4'  // Manually set to Week 4
        };

        // Process each position
        for (const [position, players] of Object.entries(combinedData.rankings)) {
            const positionKey = position.toLowerCase();

            // Map DST to def, K stays as k
            let targetKey = positionKey;
            if (positionKey === 'dst') {
                targetKey = 'def';
            }

            // Only include opponent field for defenses
            if (targetKey === 'def') {
                transformedRankings[targetKey] = players.map(player => ({
                    preGameRank: player.rank,
                    player: player.name,
                    opponent: player.opponent || ''  // Use the opponent field from the data
                }));
            } else if (targetKey === 'flex') {
                // FLEX needs special handling - use overall_rank and position_rank from the data
                transformedRankings[targetKey] = players.map(player => ({
                    preGameRank: player.overall_rank,  // Use the overall_rank from the data
                    player: player.name,
                    positionRank: player.position_rank || ''  // Use position_rank directly (e.g., "RB1", "WR5", etc.)
                }));
            } else {
                transformedRankings[targetKey] = players.map(player => ({
                    preGameRank: player.rank,
                    player: player.name
                    // No opponent field for other positions
                }));
            }

            console.log(`   ✅ ${targetKey.toUpperCase()}: ${transformedRankings[targetKey].length} players`);
        }

        // Create a backup of the existing rankings.json
        const rankingsPath = path.join(__dirname, 'rankings.json');
        try {
            const existingData = await fs.readFile(rankingsPath, 'utf8');
            const backupPath = path.join(__dirname, `rankings.backup.${Date.now()}.json`);
            await fs.writeFile(backupPath, existingData);
            console.log(`\n📦 Backup created: ${path.basename(backupPath)}`);
        } catch (e) {
            console.log('\n📄 No existing rankings.json to backup');
        }

        // Save the transformed rankings
        await fs.writeFile(rankingsPath, JSON.stringify(transformedRankings, null, 2));
        console.log('✅ rankings.json updated successfully!');

        // Update the timestamp file
        const timestampPath = path.join(__dirname, 'last_timestamp.txt');
        const newTimestamp = new Date().toISOString();
        await fs.writeFile(timestampPath, newTimestamp);
        console.log(`⏰ Timestamp updated: ${newTimestamp}`);

        console.log('\n🎉 Manual update complete!');
        console.log('   The website should now display the updated rankings.');
        console.log('   Clear your browser cache if you don\'t see the updates immediately.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\n💡 Make sure:');
        console.error('   - all_rankings_combined.json exists in the current directory');
        console.error('   - The file format is correct');
        process.exit(1);
    }
}

function getCurrentWeek() {
    // Calculate the current NFL week based on the date
    // NFL season typically starts early September
    const now = new Date();
    const year = now.getFullYear();
    const seasonStart = new Date(year, 8, 5); // September 5th as approximation

    if (now < seasonStart) {
        return 'Preseason';
    }

    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksSinceStart = Math.floor((now - seasonStart) / msPerWeek) + 1;

    if (weeksSinceStart > 18) {
        return 'Playoffs';
    }

    return `Week ${Math.min(weeksSinceStart, 18)}`;
}

// Show usage if --help is passed
if (process.argv.includes('--help')) {
    console.log('Usage: node manual-update-rankings.js');
    console.log('\nThis script:');
    console.log('  1. Reads all_rankings_combined.json from the current directory');
    console.log('  2. Transforms it to the format expected by the website');
    console.log('  3. Creates a backup of the existing rankings.json');
    console.log('  4. Updates rankings.json with the new data');
    console.log('  5. Updates the timestamp');
    process.exit(0);
}

// Run the update
updateRankings();