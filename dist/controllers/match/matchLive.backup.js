"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiveMatches = void 0;
const Match_1 = __importDefault(require("../../models/Match"));
const axios_1 = __importDefault(require("axios"));
const matchProcessor_1 = require("./matchProcessor");
const getLiveMatches = async (req, res) => {
    var _a;
    try {
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_MATCHES_LIVE_URL = process.env.RAPIDAPI_MATCHES_LIVE_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_MATCHES_LIVE_URL) {
            // Fallback to database if API config is missing
            const liveMatches = await Match_1.default.find({
                $or: [
                    { isLive: true },
                    { status: { $regex: 'Live', $options: 'i' } },
                    { status: 'LIVE' },
                    { status: { $regex: 'live', $options: 'i' } }
                ]
            })
                .sort({ priority: -1, startDate: -1 })
                .select('matchId title shortTitle teams venue series status commentary currentlyPlaying isLive format startDate endDate');
            return res.json(liveMatches);
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch live matches from Cricbuzz API
        const response = await axios_1.default.get(RAPIDAPI_MATCHES_LIVE_URL, { headers, timeout: 15000 });
        let matchesList = [];
        // Handle different response structures from RapidAPI
        if (Array.isArray(response.data)) {
            matchesList = response.data;
        }
        else if (Array.isArray(response.data.matches)) {
            matchesList = response.data.matches;
        }
        else if (response.data.typeMatches) {
            // Handle the specific structure where data is organized by match types
            const typeMatches = response.data.typeMatches;
            for (const typeMatch of typeMatches) {
                if (typeMatch.seriesMatches && Array.isArray(typeMatch.seriesMatches)) {
                    for (const seriesMatch of typeMatch.seriesMatches) {
                        if (seriesMatch.seriesAdWrapper && seriesMatch.seriesAdWrapper.matches) {
                            matchesList.push(...seriesMatch.seriesAdWrapper.matches);
                        }
                    }
                }
            }
        }
        else {
            const values = Object.values(response.data || {});
            const arr = values.find((v) => Array.isArray(v) && v.length && typeof v[0] === 'object');
            if (arr)
                matchesList = arr;
        }
        if (!matchesList || !matchesList.length) {
            // Fallback to database if API returns no data
            const liveMatches = await Match_1.default.find({
                $or: [
                    { isLive: true },
                    { status: { $regex: 'Live', $options: 'i' } },
                    { status: 'LIVE' },
                    { status: { $regex: 'live', $options: 'i' } }
                ]
            })
                .sort({ priority: -1, startDate: -1 })
                .select('matchId title shortTitle teams venue series status commentary currentlyPlaying isLive format startDate endDate');
            return res.json(liveMatches);
        }
        // Save to database
        const upsertPromises = matchesList.map(async (m) => {
            // Handle the nested structure where matches are within series
            let matchData = m;
            // If this is a series wrapper, extract the actual match data
            if (m.seriesAdWrapper && m.seriesAdWrapper.matches) {
                // This is a series wrapper, so we need to process each match in the series
                return Promise.all(m.seriesAdWrapper.matches.map(async (match) => {
                    return (0, matchProcessor_1.processAndSaveMatch)(match);
                }));
            }
            else if (m.matchInfo) {
                // This is a direct match object
                return (0, matchProcessor_1.processAndSaveMatch)(m);
            }
            else {
                // Try to handle other possible structures
                return (0, matchProcessor_1.processAndSaveMatch)(m);
            }
        });
        // Flatten the array of promises (in case of series wrappers)
        const flattenedPromises = upsertPromises.flat();
        await Promise.all(flattenedPromises);
        // Return from database
        const liveMatches = await Match_1.default.find({
            $or: [
                { isLive: true },
                { status: { $regex: 'Live', $options: 'i' } },
                { status: 'LIVE' },
                { status: { $regex: 'live', $options: 'i' } }
            ]
        })
            .sort({ priority: -1, startDate: -1 })
            .select('matchId title shortTitle teams venue series status commentary currentlyPlaying isLive format startDate endDate');
        res.json(liveMatches);
    }
    catch (error) {
        console.error('getLiveMatches error:', error);
        // Handle rate limiting
        if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
            // Fallback to database if API rate limit exceeded
            try {
                const liveMatches = await Match_1.default.find({
                    $or: [
                        { isLive: true },
                        { status: { $regex: 'Live', $options: 'i' } },
                        { status: 'LIVE' },
                        { status: { $regex: 'live', $options: 'i' } }
                    ]
                })
                    .sort({ priority: -1, startDate: -1 })
                    .select('matchId title shortTitle teams venue series status commentary currentlyPlaying isLive format startDate endDate');
                return res.json(liveMatches);
            }
            catch (dbError) {
                return res.status(500).json({ message: 'Server error', error: dbError.message });
            }
        }
        // Fallback to database if API fails
        try {
            const liveMatches = await Match_1.default.find({
                $or: [
                    { isLive: true },
                    { status: { $regex: 'Live', $options: 'i' } },
                    { status: 'LIVE' },
                    { status: { $regex: 'live', $options: 'i' } }
                ]
            })
                .sort({ priority: -1, startDate: -1 })
                .select('matchId title shortTitle teams venue series status commentary currentlyPlaying isLive format startDate endDate');
            res.json(liveMatches);
        }
        catch (dbError) {
            res.status(500).json({ message: 'Server error', error: dbError.message });
        }
    }
};
exports.getLiveMatches = getLiveMatches;
