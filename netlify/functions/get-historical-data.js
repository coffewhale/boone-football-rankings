// Netlify function to retrieve historical week data
const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // In a production environment, this would read from a database
        // For now, we'll simulate with file storage or environment variables
        
        const historicalData = {};
        
        // Try to read from a historical data file if it exists
        try {
            const dataPath = path.join('/tmp', 'historical_rankings.json');
            const data = await fs.readFile(dataPath, 'utf8');
            const parsedData = JSON.parse(data);
            Object.assign(historicalData, parsedData);
        } catch (error) {
            console.log('No historical data file found, using empty data');
        }

        // Add any environment-based historical data
        // This allows manually setting completed weeks via environment variables
        for (let week = 1; week <= 18; week++) {
            const weekKey = `week${week}`;
            const envDataKey = `HISTORICAL_WEEK_${week}_DATA`;
            
            if (process.env[envDataKey]) {
                try {
                    historicalData[weekKey] = JSON.parse(process.env[envDataKey]);
                } catch (error) {
                    console.error(`Error parsing historical data for week ${week}:`, error);
                }
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: historicalData,
                message: `Found ${Object.keys(historicalData).length} historical weeks`
            })
        };

    } catch (error) {
        console.error('Error retrieving historical data:', error);
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