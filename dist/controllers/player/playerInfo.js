"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlayerNews = exports.getPlayerInfo = void 0;
const axios_1 = __importDefault(require("axios"));
// Function to get player info
const getPlayerInfo = async (req, res) => {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_PLAYERS_INFO_URL = process.env.RAPIDAPI_PLAYERS_INFO_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_PLAYERS_INFO_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_PLAYERS_INFO_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch player info from Cricbuzz API
        // Construct the correct URL by replacing the player ID
        let url = RAPIDAPI_PLAYERS_INFO_URL;
        // Replace the player ID in the URL with the requested ID
        url = url.replace(/\/\d+$/, `/${id}`);
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getPlayerInfo error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch player info', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.getPlayerInfo = getPlayerInfo;
// Function to get player news
const getPlayerNews = async (req, res) => {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_PLAYERS_NEWS_URL = process.env.RAPIDAPI_PLAYERS_NEWS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_PLAYERS_NEWS_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_PLAYERS_NEWS_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch player news from Cricbuzz API
        // Construct the correct URL by replacing the player ID
        let url = RAPIDAPI_PLAYERS_NEWS_URL;
        // Replace the player ID in the URL with the requested ID
        url = url.replace(/\/\d+$/, `/${id}`);
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getPlayerNews error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch player news', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.getPlayerNews = getPlayerNews;
