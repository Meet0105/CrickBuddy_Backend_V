"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSeriesNews = exports.getSeriesMatches = void 0;
const axios_1 = __importDefault(require("axios"));
// New function to get series matches
const getSeriesMatches = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_SERIES_MATCHES_URL = process.env.RAPIDAPI_SERIES_MATCHES_URL;
        // If API keys are missing, serve from database
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_MATCHES_URL) {
            console.log('RapidAPI config missing, serving series matches from database');
            // Import Match model
            const Match = require('../../models/Match').default;
            // Find matches for this series
            const matches = await Match.find({ 'series.id': id })
                .sort({ startDate: -1 })
                .limit(50);
            return res.json({
                matchDetails: matches.map((match) => {
                    var _a, _b, _c, _d, _e, _f, _g;
                    return ({
                        matchDetailsMap: {
                            key: match.matchId,
                            match: {
                                matchInfo: {
                                    matchId: match.matchId,
                                    seriesId: match.series.id,
                                    seriesName: match.series.name,
                                    matchDesc: match.title,
                                    matchFormat: match.format,
                                    startDate: match.startDate,
                                    endDate: match.endDate,
                                    state: match.status,
                                    status: ((_a = match.result) === null || _a === void 0 ? void 0 : _a.resultText) || match.status,
                                    venue: {
                                        id: match.venue.name,
                                        name: match.venue.name,
                                        city: match.venue.city,
                                        country: match.venue.country
                                    },
                                    team1: {
                                        teamId: (_b = match.teams[0]) === null || _b === void 0 ? void 0 : _b.teamId,
                                        teamName: (_c = match.teams[0]) === null || _c === void 0 ? void 0 : _c.teamName,
                                        teamSName: (_d = match.teams[0]) === null || _d === void 0 ? void 0 : _d.teamShortName
                                    },
                                    team2: {
                                        teamId: (_e = match.teams[1]) === null || _e === void 0 ? void 0 : _e.teamId,
                                        teamName: (_f = match.teams[1]) === null || _f === void 0 ? void 0 : _f.teamName,
                                        teamSName: (_g = match.teams[1]) === null || _g === void 0 ? void 0 : _g.teamShortName
                                    }
                                }
                            }
                        }
                    });
                })
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Replace the hardcoded series ID in the URL with the requested series ID
        // Example: if RAPIDAPI_SERIES_MATCHES_URL is "https://cricbuzz-cricket.p.rapidapi.com/series/v1/3641"
        // and id is "1234", we want "https://cricbuzz-cricket.p.rapidapi.com/series/v1/1234"
        const baseUrl = RAPIDAPI_SERIES_MATCHES_URL.replace(/\/\d+$/, '');
        const url = `${baseUrl}/${id}`;
        // Try to fetch series matches from Cricbuzz API
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getSeriesMatches error:', error);
        // Handle rate limiting
        if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch series matches', error: error.message });
    }
};
exports.getSeriesMatches = getSeriesMatches;
// New function to get series news
const getSeriesNews = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_SERIES_NEWS_URL = process.env.RAPIDAPI_SERIES_NEWS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_NEWS_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_SERIES_NEWS_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Replace the hardcoded series ID in the URL with the requested series ID
        // Example: if RAPIDAPI_SERIES_NEWS_URL is "https://cricbuzz-cricket.p.rapidapi.com/news/v1/series/3636"
        // and id is "1234", we want "https://cricbuzz-cricket.p.rapidapi.com/news/v1/series/1234"
        const baseUrl = RAPIDAPI_SERIES_NEWS_URL.replace(/\/\d+$/, '');
        const url = `${baseUrl}/${id}`;
        // Try to fetch series news from Cricbuzz API
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getSeriesNews error:', error);
        // Handle rate limiting
        if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch series news', error: error.message });
    }
};
exports.getSeriesNews = getSeriesNews;
