"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMatchById = exports.getAllMatches = void 0;
const Match_1 = __importDefault(require("../../models/Match"));
// Function to normalize status values to match the enum
function normalizeStatus(status) {
    if (!status)
        return 'UPCOMING';
    // Convert to lowercase for case-insensitive comparison
    const lowerStatus = status.toLowerCase();
    // Map various status values to our enum
    if (lowerStatus.includes('live') || lowerStatus.includes('in progress'))
        return 'LIVE';
    if (lowerStatus.includes('complete') || lowerStatus.includes('finished') || lowerStatus.includes('won'))
        return 'COMPLETED';
    if (lowerStatus.includes('abandon'))
        return 'ABANDONED';
    if (lowerStatus.includes('cancel'))
        return 'CANCELLED';
    // For upcoming matches with date information
    if (lowerStatus.includes('match starts'))
        return 'UPCOMING';
    // Default to UPCOMING for unknown statuses
    return 'UPCOMING';
}
// Helper function to safely save match data with retry logic
const saveMatchWithRetry = async (match) => {
    let retries = 3;
    while (retries > 0) {
        try {
            await match.save();
            return;
        }
        catch (error) {
            if (error.name === 'VersionError' && retries > 1) {
                console.log(`VersionError occurred during save, retrying... (${retries - 1} retries left)`);
                retries--;
                // Instead of reload(), we need to fetch the document again from the database
                const freshMatch = await Match_1.default.findById(match._id);
                if (freshMatch) {
                    // Copy the modified fields from the old document to the fresh one
                    Object.assign(freshMatch, match);
                    match = freshMatch;
                }
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            else {
                throw error;
            }
        }
    }
};
// Function to get all matches - first check database, then API if needed
const getAllMatches = async (req, res) => {
    var _a, _b;
    try {
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        // If API key is available, fetch from API first
        if (RAPIDAPI_KEY && RAPIDAPI_HOST) {
            console.log('API key available, fetching from API');
            // Try to fetch from API endpoints
            try {
                // We'll implement API fetching logic here
                // For now, let's just return empty array to force API fetch in individual controllers
                // This function is primarily used as a fallback
            }
            catch (apiError) {
                console.error('API fetch failed, falling back to database:', apiError);
            }
        }
        // First, try to get matches from database
        const matchesFromDB = await Match_1.default.find({}).sort({ startDate: -1 }).limit(100);
        // If we have matches in the database, return them
        if (matchesFromDB && matchesFromDB.length > 0) {
            return res.json(matchesFromDB);
        }
        // If no matches in database, we would normally fetch from API
        // But for now, let's return empty array since we don't want to overload the API
        res.json([]);
    }
    catch (error) {
        console.error('getAllMatches error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        res.status(500).json({ message: 'Failed to fetch matches', error: ((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message });
    }
};
exports.getAllMatches = getAllMatches;
// Function to get match by ID - first check database, then API if needed
const getMatchById = async (req, res) => {
    var _a, _b;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        // First, try to get match from database
        const matchFromDB = await Match_1.default.findOne({ matchId: id });
        // If we have the match in the database, check if we need to refresh data
        if (matchFromDB) {
            // Normalize the status to match our enum
            const normalizedStatus = normalizeStatus(matchFromDB.status);
            let statusUpdated = false;
            if (matchFromDB.status !== normalizedStatus) {
                matchFromDB.status = normalizedStatus;
                statusUpdated = true;
            }
            // Check if we need to refresh the data based on match status
            const now = new Date();
            // Use get method to access timestamps or fallback to current time
            const lastUpdated = matchFromDB.get('updatedAt') || matchFromDB.get('createdAt') || new Date();
            // For live matches, refresh every 30 seconds
            // For upcoming matches, refresh every 5 minutes
            // For completed matches, refresh every 1 hour
            const isLive = normalizedStatus === 'LIVE';
            const isCompleted = normalizedStatus === 'COMPLETED' || normalizedStatus === 'ABANDONED' || normalizedStatus === 'CANCELLED';
            const refreshInterval = isCompleted ? 60 * 60 * 1000 : // 1 hour for completed
                isLive ? 30 * 1000 : // 30 seconds for live
                    5 * 60 * 1000; // 5 minutes for upcoming
            let needsRefresh = false;
            if ((now.getTime() - new Date(lastUpdated).getTime()) >= refreshInterval) {
                needsRefresh = true;
            }
            // If we need to refresh data and API key is available, try to fetch from API
            if (needsRefresh && RAPIDAPI_KEY && RAPIDAPI_HOST) {
                try {
                    console.log(`Refreshing data for match ${id} (status: ${normalizedStatus})`);
                    // Import the sync function
                    const { syncMatchDetails } = await Promise.resolve().then(() => __importStar(require('./matchDetailSync')));
                    // Create a mock request and response for syncMatchDetails
                    const mockReq = {
                        params: { id },
                        query: {},
                        body: {},
                        headers: {},
                        get: (name) => undefined,
                        header: (name) => undefined,
                    };
                    let syncResult = null;
                    const mockRes = {
                        json: (data) => { syncResult = data; },
                        status: (code) => ({
                            json: (data) => { syncResult = { status: code, ...data }; return mockRes; },
                            send: (data) => { syncResult = { status: code, ...data }; return mockRes; }
                        }),
                        send: (data) => { syncResult = data; return mockRes; }
                    };
                    // Call syncMatchDetails to refresh the data
                    await syncMatchDetails(mockReq, mockRes);
                    // If we got a result, return the updated match
                    if (syncResult && syncResult.match) {
                        return res.json(syncResult.match);
                    }
                }
                catch (syncError) {
                    console.error('Auto-sync failed for match:', syncError);
                    // Continue with existing data if sync fails
                }
            }
            // Process existing data to ensure scores are correct
            if (matchFromDB.raw && matchFromDB.teams) {
                let scoresUpdated = false;
                // Check if any team has zero scores
                const hasZeroScores = matchFromDB.teams.some(team => !team.score ||
                    (team.score.runs === 0 && team.score.wickets === 0 && team.score.overs === 0));
                if (hasZeroScores && matchFromDB.raw.matchScore) {
                    // Extract scores from raw data
                    const rawScore = matchFromDB.raw.matchScore;
                    // Process team 1 score
                    if (matchFromDB.teams[0] && rawScore.team1Score) {
                        let totalRuns = 0;
                        let totalWickets = 0;
                        let totalOvers = 0;
                        // Iterate through all innings for team 1
                        Object.keys(rawScore.team1Score).forEach(key => {
                            if (key.startsWith('inngs')) {
                                const innings = rawScore.team1Score[key];
                                totalRuns += innings.runs || 0;
                                totalWickets = innings.wickets || totalWickets;
                                totalOvers += innings.overs || 0;
                            }
                        });
                        // Update team 1 score if we found data
                        if (totalRuns > 0 || totalWickets > 0) {
                            matchFromDB.teams[0].score = {
                                runs: totalRuns,
                                wickets: totalWickets,
                                overs: totalOvers,
                                balls: 0,
                                runRate: 0
                            };
                            scoresUpdated = true;
                        }
                    }
                    // Process team 2 score
                    if (matchFromDB.teams[1] && rawScore.team2Score) {
                        let totalRuns = 0;
                        let totalWickets = 0;
                        let totalOvers = 0;
                        // Iterate through all innings for team 2
                        Object.keys(rawScore.team2Score).forEach(key => {
                            if (key.startsWith('inngs')) {
                                const innings = rawScore.team2Score[key];
                                totalRuns += innings.runs || 0;
                                totalWickets = innings.wickets || totalWickets;
                                totalOvers += innings.overs || 0;
                            }
                        });
                        // Update team 2 score if we found data
                        if (totalRuns > 0 || totalWickets > 0) {
                            matchFromDB.teams[1].score = {
                                runs: totalRuns,
                                wickets: totalWickets,
                                overs: totalOvers,
                                balls: 0,
                                runRate: 0
                            };
                            scoresUpdated = true;
                        }
                    }
                    // If we updated scores or status, save the match
                    if (scoresUpdated || statusUpdated) {
                        await saveMatchWithRetry(matchFromDB);
                    }
                }
            }
            return res.json(matchFromDB);
        }
        // If match not in database and API key is available, try to fetch from API
        if (RAPIDAPI_KEY && RAPIDAPI_HOST) {
            try {
                console.log('Match not in database, fetching from API');
                // Try to fetch from API using match ID
                const headers = {
                    'x-rapidapi-key': RAPIDAPI_KEY,
                    'x-rapidapi-host': RAPIDAPI_HOST
                };
                // We would need the proper endpoint for fetching match details by ID
                // This is a placeholder - you would need to implement the actual API call
                // based on the Cricbuzz API documentation
                // For now, we'll just log and continue to return 404
                console.log('API fetch for match by ID not fully implemented');
            }
            catch (apiError) {
                console.error('API fetch failed for match by ID:', apiError);
            }
        }
        // If match not in database, return 404
        res.status(404).json({ message: 'Match not found' });
    }
    catch (error) {
        console.error('getMatchById error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        res.status(500).json({ message: 'Failed to fetch match', error: ((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message });
    }
};
exports.getMatchById = getMatchById;
