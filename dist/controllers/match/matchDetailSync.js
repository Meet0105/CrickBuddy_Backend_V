"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncMultipleMatchDetails = exports.syncMatchDetails = void 0;
const Match_1 = __importDefault(require("../../models/Match"));
const matchDetailHelpers_1 = require("./matchDetailHelpers");
const apiConfig_1 = require("../../config/apiConfig");
// Helper function to map API status to our enum values
const mapStatusToEnum = (status) => {
    if (!status)
        return 'UPCOMING';
    // Convert to lowercase for case-insensitive comparison
    const lowerStatus = status.toLowerCase();
    // Map LIVE status patterns
    if (lowerStatus.includes('live') ||
        lowerStatus.includes('in progress') ||
        lowerStatus.includes('innings break') ||
        lowerStatus.includes('rain delay') ||
        lowerStatus.includes('tea break') ||
        lowerStatus.includes('lunch break') ||
        lowerStatus.includes('drinks break') ||
        lowerStatus === 'live') {
        return 'LIVE';
    }
    // Map COMPLETED status patterns
    if (lowerStatus.includes('complete') ||
        lowerStatus.includes('finished') ||
        lowerStatus.includes('won by') ||
        lowerStatus.includes('match tied') ||
        lowerStatus.includes('no result') ||
        lowerStatus.includes('result') ||
        lowerStatus === 'completed' ||
        lowerStatus === 'finished') {
        return 'COMPLETED';
    }
    // Map ABANDONED status patterns
    if (lowerStatus.includes('abandon') ||
        lowerStatus.includes('washed out') ||
        lowerStatus === 'abandoned') {
        return 'ABANDONED';
    }
    // Map CANCELLED status patterns
    if (lowerStatus.includes('cancel') ||
        lowerStatus.includes('postponed') ||
        lowerStatus === 'cancelled') {
        return 'CANCELLED';
    }
    // Map UPCOMING status patterns
    if (lowerStatus.includes('match starts') ||
        lowerStatus.includes('starts at') ||
        lowerStatus.includes('upcoming') ||
        lowerStatus.includes('scheduled') ||
        lowerStatus.includes('preview') ||
        lowerStatus === 'upcoming' ||
        lowerStatus === 'scheduled') {
        return 'UPCOMING';
    }
    // If we can't determine the status, try to make an educated guess
    // Check if it contains time information (likely upcoming)
    if (lowerStatus.match(/\d{1,2}:\d{2}/) || lowerStatus.includes('gmt') || lowerStatus.includes('ist')) {
        return 'UPCOMING';
    }
    // Default fallback
    return 'UPCOMING';
};
// Function to sync detailed match data including scorecard
const syncMatchDetails = async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_MATCHES_INFO_URL = process.env.RAPIDAPI_MATCHES_INFO_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_MATCHES_INFO_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_MATCHES_INFO_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        console.log(`Starting detailed sync for match ${id}`);
        // First, check if we have recent data in the database
        const existingMatch = await Match_1.default.findOne({ matchId: id });
        // If we have existing data, check if it's recent enough
        if (existingMatch) {
            const now = new Date();
            // Use get method to access timestamps or fallback to current time
            const lastUpdated = existingMatch.get('updatedAt') || existingMatch.get('createdAt') || new Date();
            // For completed matches, we can use cached data for longer
            const isCompleted = existingMatch.status === 'COMPLETED' || existingMatch.status === 'ABANDONED' || existingMatch.status === 'CANCELLED';
            // For live matches, refresh every 30 seconds
            // For upcoming matches, refresh every 5 minutes
            // For completed matches, refresh every 1 hour
            const refreshInterval = isCompleted ? 60 * 60 * 1000 : // 1 hour for completed
                existingMatch.status === 'LIVE' ? 30 * 1000 : // 30 seconds for live
                    5 * 60 * 1000; // 5 minutes for upcoming
            if ((now.getTime() - new Date(lastUpdated).getTime()) < refreshInterval) {
                console.log(`Using cached data for match ${id}, last updated: ${lastUpdated}`);
                return res.json({
                    message: `Using cached data for match ${id}`,
                    match: existingMatch,
                    hasScorecard: !!existingMatch.scorecard,
                    hasHistoricalScorecard: !!existingMatch.historicalScorecard,
                    hasCommentary: !!existingMatch.commentary,
                    hasHistoricalCommentary: !!existingMatch.historicalCommentary,
                    hasOvers: !!existingMatch.overs
                });
            }
        }
        // Fetch match info
        const matchInfo = await (0, matchDetailHelpers_1.fetchMatchInfo)(id, headers, RAPIDAPI_MATCHES_INFO_URL);
        // Fetch scorecard
        const scorecard = await (0, matchDetailHelpers_1.fetchScorecard)(id, headers, RAPIDAPI_MATCHES_INFO_URL);
        // Fetch historical scorecard (only if enabled)
        const historicalScorecard = (0, apiConfig_1.isFeatureEnabled)('ENABLE_HISTORICAL_DATA')
            ? await (0, matchDetailHelpers_1.fetchHistoricalScorecard)(id, headers, RAPIDAPI_MATCHES_INFO_URL)
            : null;
        // Fetch commentary (only if enabled)
        const commentary = (0, apiConfig_1.isFeatureEnabled)('ENABLE_MATCH_COMMENTARY')
            ? await (0, matchDetailHelpers_1.fetchCommentary)(id, headers, RAPIDAPI_MATCHES_INFO_URL)
            : null;
        // Fetch historical commentary (only if enabled)
        const historicalCommentary = (0, apiConfig_1.isFeatureEnabled)('ENABLE_HISTORICAL_DATA')
            ? await (0, matchDetailHelpers_1.fetchHistoricalCommentary)(id, headers, RAPIDAPI_MATCHES_INFO_URL)
            : null;
        // Fetch overs (only if enabled)
        const overs = (0, apiConfig_1.isFeatureEnabled)('ENABLE_OVERS_DATA')
            ? await (0, matchDetailHelpers_1.fetchOvers)(id, headers, RAPIDAPI_MATCHES_INFO_URL)
            : null;
        // Process and store match data
        if (matchInfo) {
            const m = matchInfo;
            const matchId = ((_a = m.matchInfo) === null || _a === void 0 ? void 0 : _a.matchId) || m.matchId || m.id || m.match_id || id;
            // Parse teams data with scores
            const teams = [];
            // Check for team data in matchInfo first, then fall back to root level
            const team1Data = ((_b = m.matchInfo) === null || _b === void 0 ? void 0 : _b.team1) || m.team1;
            const team2Data = ((_c = m.matchInfo) === null || _c === void 0 ? void 0 : _c.team2) || m.team2;
            if (team1Data) {
                const team1Score = (0, matchDetailHelpers_1.extractTeamScore)({ ...m, scorecard }, 'team1');
                console.log('🏏 Team1 Data:', JSON.stringify(team1Data, null, 2));
                console.log('🏏 Extracted team1 score:', JSON.stringify(team1Score, null, 2));
                teams.push({
                    teamId: ((_d = team1Data.teamId) === null || _d === void 0 ? void 0 : _d.toString()) || ((_e = team1Data.teamid) === null || _e === void 0 ? void 0 : _e.toString()) || '',
                    teamName: team1Data.teamName || team1Data.teamname || 'Team 1',
                    teamShortName: team1Data.teamSName || team1Data.teamsname || team1Data.teamName || team1Data.teamname || 'Team 1',
                    score: team1Score
                });
            }
            if (team2Data) {
                const team2Score = (0, matchDetailHelpers_1.extractTeamScore)({ ...m, scorecard }, 'team2');
                console.log('🏏 Team2 Data:', JSON.stringify(team2Data, null, 2));
                console.log('🏏 Extracted team2 score:', JSON.stringify(team2Score, null, 2));
                teams.push({
                    teamId: ((_f = team2Data.teamId) === null || _f === void 0 ? void 0 : _f.toString()) || ((_g = team2Data.teamid) === null || _g === void 0 ? void 0 : _g.toString()) || '',
                    teamName: team2Data.teamName || team2Data.teamname || 'Team 2',
                    teamShortName: team2Data.teamSName || team2Data.teamsname || team2Data.teamName || team2Data.teamname || 'Team 2',
                    score: team2Score
                });
            }
            // Debug: Log the final teams array
            console.log('🏏 Final teams array:', JSON.stringify(teams, null, 2));
            // Determine the correct status based on match data
            const rawStatus = ((_h = m.matchInfo) === null || _h === void 0 ? void 0 : _h.state) || m.status || 'UPCOMING';
            const mappedStatus = mapStatusToEnum(rawStatus);
            // Check if match should be live based on time
            const currentTime = new Date();
            const matchStartTime = ((_j = m.matchInfo) === null || _j === void 0 ? void 0 : _j.startDate) ? new Date(parseInt(m.matchInfo.startDate)) : null;
            const shouldBeLive = matchStartTime &&
                matchStartTime <= currentTime &&
                (currentTime.getTime() - matchStartTime.getTime()) < (8 * 60 * 60 * 1000) && // Started within 8 hours
                mappedStatus === 'UPCOMING'; // Only override if currently upcoming
            // Preserve existing status if it's already LIVE or COMPLETED
            let finalStatus = mappedStatus;
            if (existingMatch) {
                // If existing match is LIVE, keep it LIVE unless it's actually completed
                if (existingMatch.status === 'LIVE' && mappedStatus !== 'COMPLETED' && mappedStatus !== 'ABANDONED' && mappedStatus !== 'CANCELLED') {
                    finalStatus = 'LIVE';
                }
                // If existing match is COMPLETED, ABANDONED, or CANCELLED, keep that status
                else if (['COMPLETED', 'ABANDONED', 'CANCELLED'].includes(existingMatch.status)) {
                    finalStatus = existingMatch.status;
                }
            }
            // Override with time-based logic if needed
            if (shouldBeLive) {
                finalStatus = 'LIVE';
            }
            const isLive = finalStatus === 'LIVE';
            const doc = {
                matchId: matchId === null || matchId === void 0 ? void 0 : matchId.toString(),
                title: ((_k = m.matchInfo) === null || _k === void 0 ? void 0 : _k.matchDesc) || m.name || m.title || 'Match',
                shortTitle: ((_l = m.matchInfo) === null || _l === void 0 ? void 0 : _l.matchDesc) || m.shortName || m.title || 'Match',
                subTitle: ((_m = m.matchInfo) === null || _m === void 0 ? void 0 : _m.seriesName) || m.subtitle || '',
                format: ((_o = m.matchInfo) === null || _o === void 0 ? void 0 : _o.matchFormat) || 'OTHER',
                status: finalStatus,
                venue: {
                    name: ((_q = (_p = m.matchInfo) === null || _p === void 0 ? void 0 : _p.venueInfo) === null || _q === void 0 ? void 0 : _q.ground) || ((_r = m.venueinfo) === null || _r === void 0 ? void 0 : _r.ground) || m.venue || 'Unknown Venue',
                    city: ((_t = (_s = m.matchInfo) === null || _s === void 0 ? void 0 : _s.venueInfo) === null || _t === void 0 ? void 0 : _t.city) || ((_u = m.venueinfo) === null || _u === void 0 ? void 0 : _u.city) || m.city || '',
                    country: ((_w = (_v = m.matchInfo) === null || _v === void 0 ? void 0 : _v.venueInfo) === null || _w === void 0 ? void 0 : _w.country) || ((_x = m.venueinfo) === null || _x === void 0 ? void 0 : _x.country) || m.country || ''
                },
                startDate: ((_y = m.matchInfo) === null || _y === void 0 ? void 0 : _y.startDate) ? new Date(parseInt(m.matchInfo.startDate)) : new Date(),
                endDate: ((_z = m.matchInfo) === null || _z === void 0 ? void 0 : _z.endDate) ? new Date(parseInt(m.matchInfo.endDate)) : undefined,
                series: {
                    id: ((_1 = (_0 = m.matchInfo) === null || _0 === void 0 ? void 0 : _0.seriesId) === null || _1 === void 0 ? void 0 : _1.toString()) || '0',
                    name: ((_2 = m.matchInfo) === null || _2 === void 0 ? void 0 : _2.seriesName) || 'Unknown Series',
                    seriesType: 'INTERNATIONAL'
                },
                teams: teams,
                isLive: isLive,
                priority: 0,
                raw: m
            };
            // Add scorecard data if available
            if (scorecard) {
                // Log scorecard data for debugging
                console.log('Scorecard data:', JSON.stringify(scorecard, null, 2));
                doc.scorecard = scorecard;
            }
            // Add historical scorecard data if available
            if (historicalScorecard) {
                doc.historicalScorecard = historicalScorecard;
            }
            // Add commentary data if available
            if (commentary) {
                doc.commentary = {
                    ...commentary,
                    lastUpdated: new Date()
                };
            }
            // Add historical commentary data if available
            if (historicalCommentary) {
                doc.historicalCommentary = {
                    ...historicalCommentary,
                    lastUpdated: new Date()
                };
            }
            // Add overs data if available
            if (overs) {
                doc.overs = {
                    ...overs,
                    lastUpdated: new Date()
                };
            }
            // Remove undefined values
            Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);
            // Update or create match
            const updatedMatch = await Match_1.default.findOneAndUpdate({ matchId: doc.matchId }, { $set: doc }, { upsert: true, new: true, setDefaultsOnInsert: true });
            console.log(`Successfully synced match ${id} with detailed data`);
            return res.json({
                message: `Successfully synced match ${id} with detailed data`,
                match: updatedMatch,
                hasScorecard: !!scorecard,
                hasHistoricalScorecard: !!historicalScorecard,
                hasCommentary: !!commentary,
                hasHistoricalCommentary: !!historicalCommentary,
                hasOvers: !!overs
            });
        }
        res.status(404).json({ message: 'No match data found' });
    }
    catch (error) {
        console.error('syncMatchDetails error:', error);
        // Handle rate limiting
        if (((_3 = error === null || error === void 0 ? void 0 : error.response) === null || _3 === void 0 ? void 0 : _3.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to sync match details', error: error.message });
    }
};
exports.syncMatchDetails = syncMatchDetails;
// Function to sync multiple matches with details
const syncMultipleMatchDetails = async (req, res) => {
    try {
        const { matchIds } = req.body;
        if (!matchIds || !Array.isArray(matchIds)) {
            return res.status(400).json({ message: 'matchIds array is required' });
        }
        const results = [];
        for (const matchId of matchIds) {
            try {
                // Create a proper mock request object for syncMatchDetails
                const mockReq = {
                    params: { id: matchId },
                    query: {},
                    body: {},
                    headers: {},
                    get: () => undefined,
                    header: () => undefined,
                };
                let result = null;
                // Create a mock response object to capture the result
                const mockRes = {
                    json: (data) => { result = data; return mockRes; },
                    status: (code) => ({
                        json: (data) => { result = { status: code, ...data }; return mockRes; },
                        send: (data) => { result = { status: code, ...data }; return mockRes; }
                    }),
                    send: (data) => { result = data; return mockRes; }
                };
                await (0, exports.syncMatchDetails)(mockReq, mockRes);
                results.push({ matchId, result });
                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            catch (error) {
                results.push({ matchId, error: error.message });
            }
        }
        res.json({
            message: `Processed ${matchIds.length} matches`,
            results
        });
    }
    catch (error) {
        console.error('syncMultipleMatchDetails error:', error);
        res.status(500).json({ message: 'Failed to sync multiple match details', error: error.message });
    }
};
exports.syncMultipleMatchDetails = syncMultipleMatchDetails;
