"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecords = exports.getRecordsFilters = void 0;
const axios_1 = __importDefault(require("axios"));
// Function to get records filters
const getRecordsFilters = async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        // Use specific ranking API key if available, otherwise fallback to general key
        const RAPIDAPI_KEY = process.env.RAPIDAPI_RANKING_KEY || process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_STATS_RECORDS_FILTERS_URL = process.env.RAPIDAPI_STATS_RECORDS_FILTERS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_STATS_RECORDS_FILTERS_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_STATS_RECORDS_FILTERS_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch records filters from Cricbuzz API
        const response = await axios_1.default.get(RAPIDAPI_STATS_RECORDS_FILTERS_URL, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getRecordsFilters error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
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
                message: 'API subscription required for records filters. Please check your API key.',
                error: 'Subscription required'
            });
        }
        res.status(500).json({ message: 'Failed to fetch records filters', error: ((_g = error === null || error === void 0 ? void 0 : error.response) === null || _g === void 0 ? void 0 : _g.data) || error.message });
    }
};
exports.getRecordsFilters = getRecordsFilters;
// Function to get records
const getRecords = async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const { statsType = 'mostRuns', categoryId = '0' } = req.query;
        // Use specific ranking API key if available, otherwise fallback to general key
        const RAPIDAPI_KEY = process.env.RAPIDAPI_RANKING_KEY || process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_STATS_RECORDS_URL = process.env.RAPIDAPI_STATS_RECORDS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_STATS_RECORDS_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_STATS_RECORDS_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch records from Cricbuzz API
        const url = `${RAPIDAPI_STATS_RECORDS_URL}/${categoryId}?statsType=${statsType}`;
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getRecords error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
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
                message: 'API subscription required for records. Please check your API key.',
                error: 'Subscription required'
            });
        }
        res.status(500).json({ message: 'Failed to fetch records', error: ((_g = error === null || error === void 0 ? void 0 : error.response) === null || _g === void 0 ? void 0 : _g.data) || error.message });
    }
};
exports.getRecords = getRecords;
