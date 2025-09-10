// Debug function to see defense CSV structure
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    console.log('🔍 Debugging defense CSV structure...');
    
    try {
        const defUrls = (process.env.DEF_URLS || "").split(',').filter(url => url.trim());
        
        if (defUrls.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'No DEF_URLS configured'
                })
            };
        }
        
        // Auto-discover CSV URL for defense
        const csvUrl = await convertToCSVUrl(defUrls[0]);
        console.log(`📊 Testing defense CSV: ${csvUrl}`);
        
        const response = await fetch(csvUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const csvText = await response.text();
        const lines = csvText.trim().split('\n');
        
        const result = {
            csvUrl: csvUrl,
            totalLines: lines.length,
            header: lines[0],
            headerFields: parseCSVLine(lines[0]),
            sampleRows: []
        };
        
        // Parse first 5 data rows to see structure
        for (let i = 1; i < Math.min(6, lines.length); i++) {
            const fields = parseCSVLine(lines[i]);
            result.sampleRows.push({
                rawLine: lines[i],
                parsedFields: fields,
                fieldCount: fields.length
            });
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify(result, null, 2)
        };
        
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message
            })
        };
    }
};

async function convertToCSVUrl(datawrapperUrl) {
    // Extract chart ID and build CSV URL
    let chartId = null;
    
    const urlMatch = datawrapperUrl.match(/\/([a-zA-Z0-9]{5,})\/?\??/);
    if (urlMatch) {
        chartId = urlMatch[1];
    }
    
    if (!chartId) {
        // Try to fetch page and find ID
        const response = await fetch(datawrapperUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
        });
        
        if (response.ok) {
            const html = await response.text();
            const patterns = [
                /"chartId":\s*"([a-zA-Z0-9]{5,})"/,
                /"id":\s*"([a-zA-Z0-9]{5,})"/,
                /chart\/([a-zA-Z0-9]{5,})/
            ];
            
            for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match) {
                    chartId = match[1];
                    break;
                }
            }
        }
    }
    
    if (!chartId) {
        throw new Error('Could not extract chart ID');
    }
    
    return `https://datawrapper.dwcdn.net/${chartId}/1/dataset.csv`;
}

function parseCSVLine(line) {
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(currentField);
            currentField = '';
        } else {
            currentField += char;
        }
    }
    fields.push(currentField);
    return fields;
}