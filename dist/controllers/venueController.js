"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncVenuesFromRapidAPI = exports.getVenueMatches = exports.getVenueStats = exports.getVenueInfo = exports.getVenueById = exports.getAllVenues = void 0;
const Venue_1 = __importDefault(require("../models/Venue"));
const axios_1 = __importDefault(require("axios"));
const getAllVenues = async (req, res) => {
    try {
        const venues = await Venue_1.default.find().lean();
        res.json(venues);
    }
    catch (error) {
        console.error('getAllVenues error:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.getAllVenues = getAllVenues;
const getVenueById = async (req, res) => {
    try {
        const venue = await Venue_1.default.findOne({ venueId: req.params.id });
        if (!venue)
            return res.status(404).json({ message: 'Venue not found' });
        res.json(venue);
    }
    catch (error) {
        console.error('getVenueById error:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.getVenueById = getVenueById;
// Function to get venue info
const getVenueInfo = async (req, res) => {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_VENUES_INFO_URL = process.env.RAPIDAPI_VENUES_INFO_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_VENUES_INFO_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_VENUES_INFO_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch venue info from Cricbuzz API
        const url = `${RAPIDAPI_VENUES_INFO_URL}/${id}`;
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getVenueInfo error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch venue info', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.getVenueInfo = getVenueInfo;
// Function to get venue stats
const getVenueStats = async (req, res) => {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_VENUES_STATS_URL = process.env.RAPIDAPI_VENUES_STATS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_VENUES_STATS_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_VENUES_STATS_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch venue stats from Cricbuzz API
        const url = `${RAPIDAPI_VENUES_STATS_URL}/${id}`;
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getVenueStats error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch venue stats', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.getVenueStats = getVenueStats;
// Function to get venue matches
const getVenueMatches = async (req, res) => {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_VENUES_MATCHES_URL = process.env.RAPIDAPI_VENUES_MATCHES_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_VENUES_MATCHES_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_VENUES_MATCHES_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch venue matches from Cricbuzz API
        const url = `${RAPIDAPI_VENUES_MATCHES_URL}/${id}/matches`;
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getVenueMatches error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch venue matches', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.getVenueMatches = getVenueMatches;
// New function to sync venues from RapidAPI
const syncVenuesFromRapidAPI = async (req, res) => {
    var _a, _b, _c;
    try {
        // For venues, we don't have a direct list endpoint, so we'll create a placeholder
        // In a real implementation, you would either have a list of venue IDs or fetch them from another endpoint
        res.json({ message: 'Venue sync endpoint ready. Add venue IDs manually or implement list endpoint.' });
    }
    catch (error) {
        console.error('syncVenuesFromRapidAPI error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Venues sync failed', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.syncVenuesFromRapidAPI = syncVenuesFromRapidAPI;
