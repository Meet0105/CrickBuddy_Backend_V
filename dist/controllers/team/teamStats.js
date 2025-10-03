"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamStats = exports.getTeamStatsFilters = void 0;
const axios_1 = __importDefault(require("axios"));
// Function to get team stats filters
const getTeamStatsFilters = async (req, res) => {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_TEAMS_STATS_FILTERS_URL = process.env.RAPIDAPI_TEAMS_STATS_FILTERS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_TEAMS_STATS_FILTERS_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_TEAMS_STATS_FILTERS_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Replace the hardcoded team ID in the URL with the requested team ID
        // Example: if RAPIDAPI_TEAMS_STATS_FILTERS_URL is "https://cricbuzz-cricket.p.rapidapi.com/stats/v1/team/2"
        // and id is "5", we want "https://cricbuzz-cricket.p.rapidapi.com/stats/v1/team/5"
        let url = RAPIDAPI_TEAMS_STATS_FILTERS_URL;
        // Replace the team ID in the path
        url = url.replace(/\/team\/\d+/, `/team/${id}`);
        console.log(`Fetching team stats filters for team ID ${id} from URL: ${url}`);
        // Try to fetch team stats filters from Cricbuzz API
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getTeamStatsFilters error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch team stats filters', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.getTeamStatsFilters = getTeamStatsFilters;
// Function to get team stats
const getTeamStats = async (req, res) => {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const { statsType = 'mostRuns' } = req.query;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_TEAMS_STATS_URL = process.env.RAPIDAPI_TEAMS_STATS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_TEAMS_STATS_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_TEAMS_STATS_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Replace the hardcoded team ID in the URL with the requested team ID and update statsType
        // Example: if RAPIDAPI_TEAMS_STATS_URL is "https://cricbuzz-cricket.p.rapidapi.com/stats/v1/team/2?statsType=mostRuns"
        // and id is "5", we want "https://cricbuzz-cricket.p.rapidapi.com/stats/v1/team/5?statsType=mostRuns"
        let url = RAPIDAPI_TEAMS_STATS_URL;
        // Replace the team ID in the path
        url = url.replace(/\/team\/\d+\?/, `/team/${id}?`);
        // Update statsType if provided
        url = url.replace(/statsType=([^&]*)/, `statsType=${statsType}`);
        console.log(`Fetching team stats for team ID ${id} with statsType ${statsType} from URL: ${url}`);
        // Try to fetch team stats from Cricbuzz API
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getTeamStats error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch team stats', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.getTeamStats = getTeamStats;
