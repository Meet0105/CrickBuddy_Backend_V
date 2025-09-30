"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlayerBowling = exports.getPlayerBatting = exports.getPlayerCareer = void 0;
const axios_1 = __importDefault(require("axios"));
// Function to get player career stats
const getPlayerCareer = async (req, res) => {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_PLAYERS_CAREER_URL = process.env.RAPIDAPI_PLAYERS_CAREER_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_PLAYERS_CAREER_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_PLAYERS_CAREER_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch player career stats from Cricbuzz API
        // Construct the correct URL by replacing the player ID
        let url = RAPIDAPI_PLAYERS_CAREER_URL;
        // Replace the player ID in the URL with the requested ID
        url = url.replace(/\/\d+\/career$/, `/${id}/career`);
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        // Ensure we return a proper structure
        const data = response.data || {};
        res.json(data);
    }
    catch (error) {
        console.error('getPlayerCareer error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch player career stats', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.getPlayerCareer = getPlayerCareer;
// Function to get player batting stats
const getPlayerBatting = async (req, res) => {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_PLAYERS_BATTING_URL = process.env.RAPIDAPI_PLAYERS_BATTING_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_PLAYERS_BATTING_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_PLAYERS_BATTING_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch player batting stats from Cricbuzz API
        // Construct the correct URL by replacing the player ID
        let url = RAPIDAPI_PLAYERS_BATTING_URL;
        // Replace the player ID in the URL with the requested ID
        url = url.replace(/\/\d+\/batting$/, `/${id}/batting`);
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        // Ensure we return a proper structure
        const data = response.data || {};
        res.json(data);
    }
    catch (error) {
        console.error('getPlayerBatting error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch player batting stats', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.getPlayerBatting = getPlayerBatting;
// Function to get player bowling stats
const getPlayerBowling = async (req, res) => {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_PLAYERS_BOWLING_URL = process.env.RAPIDAPI_PLAYERS_BOWLING_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_PLAYERS_BOWLING_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_PLAYERS_BOWLING_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch player bowling stats from Cricbuzz API
        // Construct the correct URL by replacing the player ID
        let url = RAPIDAPI_PLAYERS_BOWLING_URL;
        // Replace the player ID in the URL with the requested ID
        url = url.replace(/\/\d+\/bowling$/, `/${id}/bowling`);
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        // Ensure we return a proper structure
        const data = response.data || {};
        res.json(data);
    }
    catch (error) {
        console.error('getPlayerBowling error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch player bowling stats', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.getPlayerBowling = getPlayerBowling;
