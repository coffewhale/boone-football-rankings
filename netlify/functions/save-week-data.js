// Netlify function to save completed week data
const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, error: 'Method not allowed' })
        };
    }

    try {
        const { weekNumber, weekData, completed = false } = JSON.parse(event.body);
        
        if (!weekNumber || !weekData) {
            throw new Error('Missing required fields: weekNumber, weekData');
        }

        const weekKey = `week${weekNumber}`;
        
        // Read existing historical data
        let historicalData = {};
        const dataPath = path.join('/tmp', 'historical_rankings.json');
        
        try {
            const existingData = await fs.readFile(dataPath, 'utf8');
            historicalData = JSON.parse(existingData);
        } catch (error) {
            console.log('Creating new historical data file');
        }

        // Add/update the week data
        historicalData[weekKey] = {
            data: weekData,
            weekNumber: parseInt(weekNumber),
            completed: completed,
            savedAt: new Date().toISOString()
        };

        // Save back to file
        await fs.writeFile(dataPath, JSON.stringify(historicalData, null, 2));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: `Week ${weekNumber} data saved successfully`,
                weekKey: weekKey,
                completed: completed
            })
        };

    } catch (error) {
        console.error('Error saving week data:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};