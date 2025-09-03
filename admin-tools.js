// Admin tools for site owner only
// Usage: node admin-tools.js [command]

const fetch = require('node-fetch');

const SITE_URL = process.env.SITE_URL || 'https://your-site.netlify.app';
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY;

async function manualScrape() {
    console.log('🔄 Triggering manual scrape...');
    
    if (!ADMIN_KEY) {
        console.error('❌ ADMIN_SECRET_KEY environment variable not set');
        return;
    }
    
    try {
        const response = await fetch(`${SITE_URL}/.netlify/functions/update-rankings`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ADMIN_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Manual scrape completed');
            console.log(`Positions updated: ${Object.keys(result.data).join(', ')}`);
        } else {
            console.error('❌ Scrape failed:', result.error);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function archiveWeek(weekNumber) {
    console.log(`📁 Archiving week ${weekNumber}...`);
    
    // This would contain the actual fantasy results
    // You'd update this with real data after each week
    const weekData = {
        // Add actual results here
    };
    
    try {
        const response = await fetch(`${SITE_URL}/.netlify/functions/save-week-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                weekNumber: parseInt(weekNumber),
                weekData: weekData,
                completed: true
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log(`✅ Week ${weekNumber} archived successfully`);
        } else {
            console.error('❌ Archive failed:', result.error);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function checkStatus() {
    console.log('📊 Checking site status...');
    
    try {
        const response = await fetch(`${SITE_URL}/.netlify/functions/get-historical-data`);
        const result = await response.json();
        
        if (result.success) {
            console.log(`✅ Site is running`);
            console.log(`📚 Historical weeks: ${Object.keys(result.data).length}`);
            Object.keys(result.data).forEach(week => {
                const weekData = result.data[week];
                const status = weekData.completed ? '✅ Complete' : '⏳ In Progress';
                console.log(`  ${week}: ${status}`);
            });
        }
    } catch (error) {
        console.error('❌ Site check failed:', error.message);
    }
}

// Command line interface
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
    case 'scrape':
        manualScrape();
        break;
    case 'archive':
        if (!arg) {
            console.error('Usage: node admin-tools.js archive <week-number>');
            process.exit(1);
        }
        archiveWeek(arg);
        break;
    case 'status':
        checkStatus();
        break;
    default:
        console.log('🔧 Admin Tools');
        console.log('Usage:');
        console.log('  node admin-tools.js scrape     - Manual scrape rankings');
        console.log('  node admin-tools.js archive 1  - Archive week 1 results');  
        console.log('  node admin-tools.js status     - Check site status');
        console.log('');
        console.log('Environment variables needed:');
        console.log('  SITE_URL=https://your-site.netlify.app');
        console.log('  ADMIN_SECRET_KEY=your-secret-key');
}