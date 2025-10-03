"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamResults = exports.getTeamSchedules = exports.testTeamAPI = void 0;
const axios_1 = __importDefault(require("axios"));
// Test function to debug team API response
const testTeamAPI = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const { endpoint } = req.query; // schedule, results, news, players
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
            return res.status(500).json({ message: 'API config missing' });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        let url = '';
        switch (endpoint) {
            case 'schedule':
                url = `https://${RAPIDAPI_HOST}/teams/v1/${id}/schedule`;
                break;
            case 'results':
                url = `https://${RAPIDAPI_HOST}/teams/v1/${id}/results`;
                break;
            case 'news':
                url = `https://${RAPIDAPI_HOST}/news/v1/team/${id}`;
                break;
            case 'players':
                url = `https://${RAPIDAPI_HOST}/teams/v1/${id}/players`;
                break;
            default:
                url = `https://${RAPIDAPI_HOST}/teams/v1/${id}`;
        }
        console.log('🧪 TESTING TEAM API CALL:', url);
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        // Return raw API response for inspection
        res.json({
            url: url,
            status: response.status,
            headers: response.headers,
            data: response.data
        });
    }
    catch (error) {
        console.error('Test Team API error:', error);
        res.status(500).json({
            message: 'Test API failed',
            error: error.message,
            response: (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data
        });
    }
};
exports.testTeamAPI = testTeamAPI;
// Function to get team schedules
const getTeamSchedules = async (req, res) => {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_TEAMS_SCHEDULE_URL = process.env.RAPIDAPI_TEAMS_SCHEDULE_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_TEAMS_SCHEDULE_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_TEAMS_SCHEDULE_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Build the URL directly using the working format
        const url = `https://${RAPIDAPI_HOST}/teams/v1/${id}/schedule`;
        console.log(`Fetching team schedules for team ID ${id} from URL: ${url}`);
        // Try to fetch team schedules from Cricbuzz API
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getTeamSchedules error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch team schedules', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.getTeamSchedules = getTeamSchedules;
// Function to get team results
const getTeamResults = async (req, res) => {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_TEAMS_RESULTS_URL = process.env.RAPIDAPI_TEAMS_RESULTS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_TEAMS_RESULTS_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_TEAMS_RESULTS_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Build the URL directly using the working format
        const url = `https://${RAPIDAPI_HOST}/teams/v1/${id}/results`;
        console.log(`Fetching team results for team ID ${id} from URL: ${url}`);
        // Try to fetch team results from Cricbuzz API
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getTeamResults error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch team results', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.getTeamResults = getTeamResults;
