#!/usr/bin/env node

// Script to manually trigger the Boone rankings refresh
const fetch = require('node-fetch');

async function manualRefresh() {
    console.log('🚀 Manually triggering Boone rankings refresh...\n');

    // Check if we're running locally or against production
    const isLocal = process.argv.includes('--local');

    const baseUrl = isLocal
        ? 'http://localhost:8888'
        : 'https://boone-football-rankings.netlify.app';

    const endpoint = `${baseUrl}/.netlify/functions/working-timestamp-updater`;

    console.log(`📡 Calling: ${endpoint}`);
    console.log('⏳ This may take a moment...\n');

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                manual: true,
                timestamp: new Date().toISOString()
            }),
            timeout: 60000 // 60 second timeout
        });

        const data = await response.json();

        if (data.success) {
            console.log('✅ SUCCESS!\n');

            if (data.updateNeeded) {
                console.log('🔄 Rankings were updated!');
                console.log(`   📊 Total players: ${data.totalPlayers || 'N/A'}`);
                console.log(`   🕐 New timestamp: ${data.timestamps?.current || 'N/A'}`);
                console.log(`   📝 Commit SHA: ${data.commit?.sha ? data.commit.sha.substring(0, 7) : 'N/A'}`);

                if (data.manualStep) {
                    console.log('\n⚠️  Manual step required:');
                    console.log(`   ${data.manualStep}`);
                }
            } else {
                console.log('ℹ️  No update needed - rankings are already current');
                if (data.timestamps) {
                    console.log(`   Current: ${data.timestamps.current || 'N/A'}`);
                    console.log(`   Stored: ${data.timestamps.stored || 'N/A'}`);
                }
            }
        } else {
            console.log('❌ FAILED!');
            console.log(`   Error: ${data.error || 'Unknown error'}`);
        }

        if (process.argv.includes('--verbose')) {
            console.log('\n📝 Full response:');
            console.log(JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\n💡 Tips:');
        if (isLocal) {
            console.error('   - Make sure Netlify Dev is running: netlify dev');
            console.error('   - Check that .env file exists with required variables');
        } else {
            console.error('   - Check that the Netlify site is deployed and accessible');
            console.error('   - Verify environment variables are set in Netlify dashboard');
        }
    }
}

// Show usage if --help is passed
if (process.argv.includes('--help')) {
    console.log('Usage: node manual-refresh.js [options]');
    console.log('\nOptions:');
    console.log('  --local      Run against local Netlify Dev server (localhost:8888)');
    console.log('  --verbose    Show full response details');
    console.log('  --help       Show this help message');
    console.log('\nExamples:');
    console.log('  node manual-refresh.js                  # Run against production');
    console.log('  node manual-refresh.js --local          # Run against local dev server');
    console.log('  node manual-refresh.js --local --verbose # Local with full output');
    process.exit(0);
}

// Run the refresh
manualRefresh();