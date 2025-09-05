// Get the last stored timestamp for display on the frontend
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, error: 'Method not allowed' })
        };
    }

    try {
        const lastStoredTimestamp = process.env.LAST_STORED_TIMESTAMP;
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                timestamp: lastStoredTimestamp || null,
                formatted: lastStoredTimestamp ? formatTimestamp(lastStoredTimestamp) : null
            })
        };
    } catch (error) {
        console.error('Error getting timestamp:', error);
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

function formatTimestamp(isoString) {
    if (!isoString) return null;
    
    try {
        const date = new Date(isoString);
        
        // Format as "September 4, 2025 at 6:46 PM CDT"
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short',
            timeZone: 'America/Chicago' // CDT/CST
        };
        
        return date.toLocaleString('en-US', options);
    } catch (error) {
        console.error('Error formatting timestamp:', error);
        return isoString; // Return original if formatting fails
    }
}