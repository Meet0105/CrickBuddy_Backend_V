"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSeriesPointsTable = exports.getSeriesVenues = void 0;
const axios_1 = __importDefault(require("axios"));
// New function to get series venues
const getSeriesVenues = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_SERIES_VENUES_URL = process.env.RAPIDAPI_SERIES_VENUES_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_VENUES_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_SERIES_VENUES_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Replace the hardcoded series ID in the URL with the requested series ID
        // Example: if RAPIDAPI_SERIES_VENUES_URL is "https://cricbuzz-cricket.p.rapidapi.com/series/v1/3718/venues"
        // and id is "1234", we want "https://cricbuzz-cricket.p.rapidapi.com/series/v1/1234/venues"
        const baseUrl = RAPIDAPI_SERIES_VENUES_URL.replace(/\/\d+\/venues$/, '');
        const url = `${baseUrl}/${id}/venues`;
        // Try to fetch series venues from Cricbuzz API
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getSeriesVenues error:', error);
        // Handle rate limiting
        if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch series venues', error: error.message });
    }
};
exports.getSeriesVenues = getSeriesVenues;
// New function to get series points table
const getSeriesPointsTable = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_SERIES_POINTS_TABLE_URL = process.env.RAPIDAPI_SERIES_POINTS_TABLE_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_POINTS_TABLE_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_SERIES_POINTS_TABLE_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Replace the hardcoded series ID in the URL with the requested series ID
        // Example: if RAPIDAPI_SERIES_POINTS_TABLE_URL is "https://cricbuzz-cricket.p.rapidapi.com/stats/v1/series/3718/points-table"
        // and id is "1234", we want "https://cricbuzz-cricket.p.rapidapi.com/stats/v1/series/1234/points-table"
        const baseUrl = RAPIDAPI_SERIES_POINTS_TABLE_URL.replace(/\/\d+\/points-table$/, '');
        const url = `${baseUrl}/${id}/points-table`;
        // Try to fetch series points table from Cricbuzz API
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getSeriesPointsTable error:', error);
        // Handle rate limiting
        if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch series points table', error: error.message });
    }
};
exports.getSeriesPointsTable = getSeriesPointsTable;
