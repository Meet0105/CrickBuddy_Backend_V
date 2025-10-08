"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRankingsFromRapidAPI = exports.getRankings = exports.getIccStandings = exports.getIccRankings = void 0;
const axios_1 = __importDefault(require("axios"));
// Function to get ICC rankings (batsmen, bowlers, all-rounders)
const getIccRankings = async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const { formatType = 'test', category = 'batsmen' } = req.query;
        // Use specific ranking API key if available, otherwise fallback to general key
        const RAPIDAPI_KEY = process.env.RAPIDAPI_RANKING_KEY || process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_STATS_ICC_RANKINGS_URL = process.env.RAPIDAPI_STATS_ICC_RANKINGS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_STATS_ICC_RANKINGS_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_STATS_ICC_RANKINGS_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch ICC rankings from Cricbuzz API
        // The URL structure is: /stats/v1/rankings/{category}?formatType={formatType}
        // Replace the category in the URL path
        let url = RAPIDAPI_STATS_ICC_RANKINGS_URL;
        // Replace 'batsmen', 'bowlers', or 'allrounders' in the URL with the requested category
        url = url.replace(/\/(batsmen|bowlers|allrounders)/, `/${category}`);
        // Replace or add the formatType query parameter
        if (url.includes('formatType=')) {
            url = url.replace(/formatType=[^&]+/, `formatType=${formatType}`);
        }
        else {
            url = `${url}${url.includes('?') ? '&' : '?'}formatType=${formatType}`;
        }
        console.log(`Fetching ${category} rankings from: ${url}`);
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getIccRankings error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        // Handle subscription errors
        if (((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.status) === 403 || ((_f = (_e = (_d = error === null || error === void 0 ? void 0 : error.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.message) === null || _f === void 0 ? void 0 : _f.includes('subscribe'))) {
            return res.status(403).json({
                message: 'API subscription required for rankings. Please check your API key.',
                error: 'Subscription required'
            });
        }
        res.status(500).json({ message: 'Failed to fetch ICC rankings', error: ((_g = error === null || error === void 0 ? void 0 : error.response) === null || _g === void 0 ? void 0 : _g.data) || error.message });
    }
};
exports.getIccRankings = getIccRankings;
// Function to get ICC standings
const getIccStandings = async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const { matchType = '1' } = req.params; // 1 = Test, 2 = ODI, 3 = T20
        // Use specific ranking API key if available, otherwise fallback to general key
        const RAPIDAPI_KEY = process.env.RAPIDAPI_RANKING_KEY || process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_STATS_ICC_STANDINGS_URL = process.env.RAPIDAPI_STATS_ICC_STANDINGS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_STATS_ICC_STANDINGS_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_STATS_ICC_STANDINGS_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch ICC standings from Cricbuzz API
        // The URL in .env ends with /1 (Test), so we need to replace it with the actual matchType
        const url = RAPIDAPI_STATS_ICC_STANDINGS_URL.replace(/\/\d+$/, `/${matchType}`);
        // Log the URL for debugging
        console.log(`Fetching standings from URL: ${url}`);
        // For T20 (matchType 3), try with retry logic since it's known to be unstable
        if (matchType === '3') {
            let lastError;
            for (let i = 0; i < 3; i++) { // Try up to 3 times
                try {
                    const response = await axios_1.default.get(url, { headers, timeout: 15000 });
                    return res.json(response.data);
                }
                catch (error) {
                    lastError = error;
                    if (i < 2) { // Don't wait after the last attempt
                        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Wait 1s, then 2s
                    }
                }
            }
            // If all retries failed, return the specific error for T20
            return res.status(500).json({
                message: 'T20 standings data is temporarily unavailable due to an issue with the external API. Please try Test (1) or ODI (2) match types instead.',
                error: 'API returned 500 Internal Server Error for T20 standings after multiple attempts'
            });
        }
        // For Test and ODI, use direct approach
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getIccStandings error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        // Handle subscription errors
        if (((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.status) === 403 || ((_f = (_e = (_d = error === null || error === void 0 ? void 0 : error.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.message) === null || _f === void 0 ? void 0 : _f.includes('subscribe'))) {
            return res.status(403).json({
                message: 'API subscription required for standings. Please check your API key.',
                error: 'Subscription required'
            });
        }
        // Check if this is a specific API error for matchType 3 (T20)
        // T20 standings (matchType 3) returns 500 error from API - this is a known issue with the external API
        // Test (matchType 1) and ODI (matchType 2) standings are working correctly
        if (((_g = req.params) === null || _g === void 0 ? void 0 : _g.matchType) === '3') {
            return res.status(500).json({
                message: 'T20 standings data is temporarily unavailable due to an issue with the external API. Please try Test (1) or ODI (2) match types instead.',
                error: 'API returned 500 Internal Server Error for T20 standings'
            });
        }
        res.status(500).json({ message: 'Failed to fetch ICC standings', error: ((_h = error === null || error === void 0 ? void 0 : error.response) === null || _h === void 0 ? void 0 : _h.data) || error.message });
    }
};
exports.getIccStandings = getIccStandings;
const getRankings = async (req, res) => {
    try {
        // For backward compatibility, we'll return a simple structure
        // In a real implementation, you might want to fetch actual data
        res.json({
            teams: {
                test: [],
                odi: [],
                t20: []
            },
            players: {
                batsmen: {
                    test: [],
                    odi: [],
                    t20: []
                },
                bowlers: {
                    test: [],
                    odi: [],
                    t20: []
                },
                allrounders: {
                    test: [],
                    odi: [],
                    t20: []
                }
            }
        });
    }
    catch (error) {
        console.error('getRankings error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.getRankings = getRankings;
const syncRankingsFromRapidAPI = async (req, res) => {
    try {
        // This endpoint can be used to sync rankings data if needed
        res.json({ message: 'Rankings sync endpoint ready' });
    }
    catch (error) {
        console.error('syncRankingsFromRapidAPI error:', error);
        res.status(500).json({ message: 'Rankings sync failed', error: error.message });
    }
};
exports.syncRankingsFromRapidAPI = syncRankingsFromRapidAPI;
