"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSeriesStats = exports.getSeriesStatsFilters = void 0;
const axios_1 = __importDefault(require("axios"));
// New function to get series stats filters
const getSeriesStatsFilters = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_SERIES_STATS_FILTERS_URL = process.env.RAPIDAPI_SERIES_STATS_FILTERS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_STATS_FILTERS_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_SERIES_STATS_FILTERS_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Replace the hardcoded series ID in the URL with the requested series ID
        // Example: if RAPIDAPI_SERIES_STATS_FILTERS_URL is "https://cricbuzz-cricket.p.rapidapi.com/stats/v1/series"
        // and id is "1234", we want "https://cricbuzz-cricket.p.rapidapi.com/stats/v1/series/1234"
        const url = `${RAPIDAPI_SERIES_STATS_FILTERS_URL}/${id}`;
        // Try to fetch series stats filters from Cricbuzz API
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getSeriesStatsFilters error:', error);
        // Handle rate limiting
        if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch series stats filters', error: error.message });
    }
};
exports.getSeriesStatsFilters = getSeriesStatsFilters;
// New function to get series stats
const getSeriesStats = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const { statsType = 'mostRuns' } = req.query;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_SERIES_STATS_URL = process.env.RAPIDAPI_SERIES_STATS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_STATS_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_SERIES_STATS_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Replace the hardcoded series ID in the URL with the requested series ID
        // Example: if RAPIDAPI_SERIES_STATS_URL is "https://cricbuzz-cricket.p.rapidapi.com/stats/v1/series"
        // and id is "1234", we want "https://cricbuzz-cricket.p.rapidapi.com/stats/v1/series/1234?statsType=mostRuns"
        const url = `${RAPIDAPI_SERIES_STATS_URL}/${id}?statsType=${statsType}`;
        // Try to fetch series stats from Cricbuzz API
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getSeriesStats error:', error);
        // Handle rate limiting
        if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch series stats', error: error.message });
    }
};
exports.getSeriesStats = getSeriesStats;
