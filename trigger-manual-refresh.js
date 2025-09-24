#!/usr/bin/env node

// Script to trigger manual refresh of Boone rankings
const fetch = require('node-fetch');

async function triggerManualRefresh() {
    console.log('🚀 Triggering manual refresh of Boone rankings...\n');

    // Check if we're running locally with Netlify Dev
    const isLocal = process.argv.includes('--local');

    // Get the base URL - either local or production
    const baseUrl = isLocal
        ? 'http://localhost:8888'
        : 'https://boone-football-rankings.netlify.app';

    const endpoint = `${baseUrl}/.netlify/functions/manual-timestamp-updater-json`;

    console.log(`📡 Calling: ${endpoint}\n`);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                trigger: 'manual',
                timestamp: new Date().toISOString()
            })
        });

        const data = await response.json();

        if (data.success) {
            console.log('✅ SUCCESS!\n');

            if (data.updateNeeded) {
                console.log('🔄 Rankings were updated:');
                console.log(`   - Total players: ${data.totalPlayers || 'N/A'}`);
                console.log(`   - New timestamp: ${data.timestamps?.currentTimestamp || 'N/A'}`);
                console.log(`   - Commit: ${data.commit?.sha ? data.commit.sha.substring(0, 7) : 'N/A'}`);
            } else {
                console.log('ℹ️  No update needed - rankings are already current');
                console.log(`   - Current timestamp: ${data.timestamps?.currentTimestamp || 'N/A'}`);
                console.log(`   - Stored timestamp: ${data.timestamps?.storedTimestamp || 'N/A'}`);
            }
        } else {
            console.log('❌ FAILED!');
            console.log(`   Error: ${data.error || 'Unknown error'}`);
        }

        console.log('\n📝 Full response:');
        console.log(JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('❌ Error triggering refresh:', error.message);
        console.error('\n💡 Tips:');
        console.error('   - For local testing, run: npm run trigger-refresh:local');
        console.error('   - Make sure Netlify Dev is running: netlify dev');
        console.error('   - Check that environment variables are set in .env');
    }
}

// Run the function
triggerManualRefresh();