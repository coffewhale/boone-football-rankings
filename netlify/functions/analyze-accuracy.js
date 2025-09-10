// Compare Justin Boone's predictions with actual FantasyPros results
const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
    console.log('🔬 Starting accuracy analysis...');
    
    try {
        const week = event.queryStringParameters?.week || '1';
        const resultsFile = event.queryStringParameters?.resultsFile;
        
        // Read Justin Boone's predictions from rankings.json
        let predictions;
        try {
            const rankingsPath = path.join(process.cwd(), 'rankings.json');
            const rankingsData = await fs.readFile(rankingsPath, 'utf8');
            predictions = JSON.parse(rankingsData);
        } catch (error) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: 'Could not read predictions from rankings.json'
                })
            };
        }
        
        // Read actual results (from request body or file)
        let actualResults;
        if (event.body) {
            try {
                const bodyData = JSON.parse(event.body);
                actualResults = bodyData.results || bodyData;
            } catch (e) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        success: false,
                        error: 'Invalid JSON in request body'
                    })
                };
            }
        } else if (resultsFile) {
            try {
                const resultsPath = path.join(process.cwd(), 'data', resultsFile);
                const resultsData = await fs.readFile(resultsPath, 'utf8');
                actualResults = JSON.parse(resultsData);
            } catch (error) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        success: false,
                        error: `Could not read results file: ${resultsFile}`
                    })
                };
            }
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    error: 'No actual results provided. Send results in request body or specify resultsFile parameter.'
                })
            };
        }
        
        // Perform the comparison
        const analysis = compareAccuracy(predictions, actualResults, week);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                week: week,
                analysis: analysis,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('❌ Analysis error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

function compareAccuracy(predictions, actualResults, week) {
    const analysis = {
        summary: {},
        detailed: {},
        topMisses: [],
        topHits: [],
        overall: {
            totalPlayers: 0,
            averageError: 0,
            positionsAnalyzed: 0
        }
    };
    
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    let totalError = 0;
    let totalPlayers = 0;
    
    positions.forEach(position => {
        const predictedPlayers = predictions[position] || [];
        const actualPlayers = actualResults.data?.[position] || actualResults[position] || [];
        
        if (predictedPlayers.length === 0 || actualPlayers.length === 0) {
            console.log(`⚠️ No data for ${position} - skipping`);
            return;
        }
        
        const positionAnalysis = {
            totalPredicted: predictedPlayers.length,
            totalActual: actualPlayers.length,
            matched: 0,
            averageRankError: 0,
            topPerformers: [],
            bigMisses: []
        };
        
        let positionErrors = [];
        
        // Create lookup map for actual results by player name
        const actualMap = new Map();
        actualPlayers.forEach(player => {
            const cleanName = cleanPlayerName(player.name);
            actualMap.set(cleanName, {
                actualRank: player.rank,
                fantasyPoints: player.fantasyPoints,
                ...player
            });
        });
        
        // Compare each predicted player with actual
        predictedPlayers.forEach((predictedPlayer, predIndex) => {
            const cleanName = cleanPlayerName(predictedPlayer.name);
            const actualPlayer = actualMap.get(cleanName);
            
            if (actualPlayer) {
                const predictedRank = predIndex + 1;
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
                    fantasy_points: actualPlayer.fantasyPoints,
                    accuracy: rankError <= 5 ? 'good' : rankError <= 10 ? 'fair' : 'poor'
                };
                
                // Track big hits and misses
                if (rankError >= 15) {
                    positionAnalysis.bigMisses.push(comparison);
                } else if (rankError <= 3) {
                    positionAnalysis.topPerformers.push(comparison);
                }
            }
        });
        
        if (positionErrors.length > 0) {
            positionAnalysis.averageRankError = positionErrors.reduce((a, b) => a + b, 0) / positionErrors.length;
            positionAnalysis.topPerformers.sort((a, b) => a.rank_error - b.rank_error);
            positionAnalysis.bigMisses.sort((a, b) => b.rank_error - a.rank_error);
        }
        
        analysis.detailed[position] = positionAnalysis;
        analysis.summary[position] = {
            matched: positionAnalysis.matched,
            averageError: Math.round(positionAnalysis.averageRankError * 10) / 10,
            accuracy: positionAnalysis.averageRankError <= 5 ? 'Excellent' : 
                     positionAnalysis.averageRankError <= 10 ? 'Good' : 'Needs Work'
        };
    });
    
    // Overall statistics
    analysis.overall = {
        totalPlayers: totalPlayers,
        averageError: totalPlayers > 0 ? Math.round((totalError / totalPlayers) * 10) / 10 : 0,
        positionsAnalyzed: Object.keys(analysis.summary).length,
        overallAccuracy: totalError / totalPlayers <= 7 ? 'Excellent' : 
                        totalError / totalPlayers <= 12 ? 'Good' : 'Needs Improvement'
    };
    
    // Get top hits and misses across all positions
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
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ')    // Normalize spaces
        .trim();
}