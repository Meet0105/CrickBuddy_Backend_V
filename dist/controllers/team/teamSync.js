"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncTeamsFromRapidAPI = void 0;
const Team_1 = __importDefault(require("../../models/Team"));
const axios_1 = __importDefault(require("axios"));
// Update the syncTeamsFromRapidAPI function to include image information
const syncTeamsFromRapidAPI = async (req, res) => {
    var _a, _b, _c;
    try {
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_TEAMS_URL = process.env.RAPIDAPI_TEAMS_LIST_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_TEAMS_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_TEAMS_LIST_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch teams from Cricbuzz API
        const response = await axios_1.default.get(RAPIDAPI_TEAMS_URL, { headers, timeout: 15000 });
        let teamsList = [];
        // Handle different response structures from RapidAPI
        if (Array.isArray(response.data)) {
            teamsList = response.data;
        }
        else if (Array.isArray(response.data.teams)) {
            teamsList = response.data.teams;
        }
        else {
            const values = Object.values(response.data || {});
            const arr = values.find((v) => Array.isArray(v) && v.length && typeof v[0] === 'object');
            if (arr)
                teamsList = arr;
        }
        if (!teamsList || !teamsList.length) {
            return res.status(500).json({
                message: 'No teams array found in RapidAPI response. Inspect provider response.',
                providerResponseSample: response.data
            });
        }
        const upsertPromises = teamsList.map(async (t) => {
            const teamId = t.id || t.teamId || t.tid || JSON.stringify(t).slice(0, 40);
            // Construct the flag image URL if imageId is available
            let flagImageUrl = '';
            if (t.imageId) {
                // Construct the proper image URL path
                flagImageUrl = `/api/photos/image/${t.imageId}`;
            }
            const doc = {
                teamId: teamId === null || teamId === void 0 ? void 0 : teamId.toString(),
                name: t.name || t.teamName || t.fullName || 'Unknown Team',
                country: t.country || t.nationality || '',
                flagImage: {
                    url: flagImageUrl,
                    alt: `${t.name || t.teamName || 'Team'} flag`
                },
                players: [], // We'll populate this separately
                raw: t
            };
            Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);
            return Team_1.default.findOneAndUpdate({ teamId: doc.teamId }, { $set: doc }, { upsert: true, new: true, setDefaultsOnInsert: true });
        });
        const results = await Promise.all(upsertPromises);
        res.json({ message: `Synced ${results.length} teams.`, count: results.length });
    }
    catch (error) {
        console.error('syncTeamsFromRapidAPI error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Teams sync failed', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.syncTeamsFromRapidAPI = syncTeamsFromRapidAPI;
