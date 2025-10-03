"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncUpcomingMatchesFromRapidAPI = exports.syncRecentMatchesFromRapidAPI = void 0;
const Match_1 = __importDefault(require("../../models/Match"));
const axios_1 = __importDefault(require("axios"));
// Helper function to map API status to our enum values
const mapStatusToEnum = (status) => {
    if (!status)
        return 'UPCOMING';
    // Convert to lowercase for case-insensitive comparison
    const lowerStatus = status.toLowerCase();
    // Map common status values
    if (lowerStatus.includes('live') || lowerStatus.includes('in progress'))
        return 'LIVE';
    if (lowerStatus.includes('complete') || lowerStatus.includes('finished'))
        return 'COMPLETED';
    if (lowerStatus.includes('abandon'))
        return 'ABANDONED';
    if (lowerStatus.includes('cancel'))
        return 'CANCELLED';
    // For upcoming matches with date information
    if (lowerStatus.includes('match starts'))
        return 'UPCOMING';
    // Default fallback
    return 'UPCOMING';
};
// Function to sync recent matches from RapidAPI
const syncRecentMatchesFromRapidAPI = async (req, res) => {
    var _a, _b, _c;
    try {
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_MATCHES_RECENT_URL = process.env.RAPIDAPI_MATCHES_RECENT_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_MATCHES_RECENT_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_MATCHES_RECENT_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch recent matches from Cricbuzz API
        const response = await axios_1.default.get(RAPIDAPI_MATCHES_RECENT_URL, { headers, timeout: 15000 });
        let matchesList = [];
        // Handle different response structures from RapidAPI
        if (response.data && response.data.typeMatches) {
            // Extract matches from typeMatches structure
            for (const typeMatch of response.data.typeMatches) {
                if (typeMatch.seriesMatches) {
                    for (const seriesMatch of typeMatch.seriesMatches) {
                        if (seriesMatch.seriesAdWrapper && seriesMatch.seriesAdWrapper.matches) {
                            matchesList = matchesList.concat(seriesMatch.seriesAdWrapper.matches);
                        }
                    }
                }
            }
        }
        else if (Array.isArray(response.data)) {
            matchesList = response.data;
        }
        else {
            const values = Object.values(response.data || {});
            const arr = values.find((v) => Array.isArray(v) && v.length && typeof v[0] === 'object');
            if (arr)
                matchesList = arr;
        }
        if (!matchesList || !matchesList.length) {
            return res.status(500).json({
                message: 'No matches array found in RapidAPI response. Inspect provider response.',
                providerResponseSample: response.data
            });
        }
        const upsertPromises = matchesList.map(async (m) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
            const matchId = ((_a = m.matchInfo) === null || _a === void 0 ? void 0 : _a.matchId) || m.id || m.matchId || JSON.stringify(m).slice(0, 40);
            // Parse teams data
            const teams = [];
            if ((_b = m.matchInfo) === null || _b === void 0 ? void 0 : _b.team1) {
                teams.push({
                    teamId: (_c = m.matchInfo.team1.teamId) === null || _c === void 0 ? void 0 : _c.toString(),
                    teamName: m.matchInfo.team1.teamName,
                    teamShortName: m.matchInfo.team1.teamSName,
                    score: {
                        runs: 0,
                        wickets: 0,
                        overs: 0
                    }
                });
            }
            if ((_d = m.matchInfo) === null || _d === void 0 ? void 0 : _d.team2) {
                teams.push({
                    teamId: (_e = m.matchInfo.team2.teamId) === null || _e === void 0 ? void 0 : _e.toString(),
                    teamName: m.matchInfo.team2.teamName,
                    teamShortName: m.matchInfo.team2.teamSName,
                    score: {
                        runs: 0,
                        wickets: 0,
                        overs: 0
                    }
                });
            }
            const doc = {
                matchId: matchId === null || matchId === void 0 ? void 0 : matchId.toString(),
                title: ((_f = m.matchInfo) === null || _f === void 0 ? void 0 : _f.matchDesc) || m.name || m.title || 'Match',
                shortTitle: ((_g = m.matchInfo) === null || _g === void 0 ? void 0 : _g.matchDesc) || m.shortName || m.title || 'Match',
                subTitle: ((_h = m.matchInfo) === null || _h === void 0 ? void 0 : _h.seriesName) || m.subtitle || '',
                format: ((_j = m.matchInfo) === null || _j === void 0 ? void 0 : _j.matchFormat) || 'OTHER',
                status: mapStatusToEnum(((_k = m.matchInfo) === null || _k === void 0 ? void 0 : _k.state) || m.status || 'UPCOMING'),
                venue: {
                    name: ((_m = (_l = m.matchInfo) === null || _l === void 0 ? void 0 : _l.venueInfo) === null || _m === void 0 ? void 0 : _m.ground) || m.venue || 'Unknown Venue',
                    city: ((_p = (_o = m.matchInfo) === null || _o === void 0 ? void 0 : _o.venueInfo) === null || _p === void 0 ? void 0 : _p.city) || m.city || '',
                    country: ((_r = (_q = m.matchInfo) === null || _q === void 0 ? void 0 : _q.venueInfo) === null || _r === void 0 ? void 0 : _r.country) || m.country || ''
                },
                startDate: ((_s = m.matchInfo) === null || _s === void 0 ? void 0 : _s.startDate) ? new Date(parseInt(m.matchInfo.startDate)) : new Date(),
                endDate: ((_t = m.matchInfo) === null || _t === void 0 ? void 0 : _t.endDate) ? new Date(parseInt(m.matchInfo.endDate)) : undefined,
                series: {
                    id: ((_v = (_u = m.matchInfo) === null || _u === void 0 ? void 0 : _u.seriesId) === null || _v === void 0 ? void 0 : _v.toString()) || '0',
                    name: ((_w = m.matchInfo) === null || _w === void 0 ? void 0 : _w.seriesName) || 'Unknown Series',
                    seriesType: 'INTERNATIONAL'
                },
                teams: teams,
                isLive: ((_x = m.matchInfo) === null || _x === void 0 ? void 0 : _x.state) === 'In Progress' || ((_y = m.matchInfo) === null || _y === void 0 ? void 0 : _y.state) === 'Complete' || false,
                priority: 0,
                raw: m
            };
            Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);
            return Match_1.default.findOneAndUpdate({ matchId: doc.matchId }, { $set: doc }, { upsert: true, new: true, setDefaultsOnInsert: true });
        });
        const results = await Promise.all(upsertPromises);
        res.json({ message: `Synced ${results.length} recent matches.`, count: results.length });
    }
    catch (error) {
        console.error('syncRecentMatchesFromRapidAPI error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Recent matches sync failed', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.syncRecentMatchesFromRapidAPI = syncRecentMatchesFromRapidAPI;
// Function to sync upcoming matches from RapidAPI
const syncUpcomingMatchesFromRapidAPI = async (req, res) => {
    var _a, _b, _c;
    try {
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_MATCHES_UPCOMING_URL = process.env.RAPIDAPI_MATCHES_UPCOMING_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_MATCHES_UPCOMING_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_MATCHES_UPCOMING_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch upcoming matches from Cricbuzz API
        const response = await axios_1.default.get(RAPIDAPI_MATCHES_UPCOMING_URL, { headers, timeout: 15000 });
        let matchesList = [];
        // Handle different response structures from RapidAPI
        if (response.data && response.data.typeMatches) {
            // Extract matches from typeMatches structure
            for (const typeMatch of response.data.typeMatches) {
                if (typeMatch.seriesMatches) {
                    for (const seriesMatch of typeMatch.seriesMatches) {
                        if (seriesMatch.seriesAdWrapper && seriesMatch.seriesAdWrapper.matches) {
                            matchesList = matchesList.concat(seriesMatch.seriesAdWrapper.matches);
                        }
                    }
                }
            }
        }
        else if (Array.isArray(response.data)) {
            matchesList = response.data;
        }
        else {
            const values = Object.values(response.data || {});
            const arr = values.find((v) => Array.isArray(v) && v.length && typeof v[0] === 'object');
            if (arr)
                matchesList = arr;
        }
        if (!matchesList || !matchesList.length) {
            return res.status(500).json({
                message: 'No matches array found in RapidAPI response. Inspect provider response.',
                providerResponseSample: response.data
            });
        }
        const upsertPromises = matchesList.map(async (m) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
            const matchId = ((_a = m.matchInfo) === null || _a === void 0 ? void 0 : _a.matchId) || m.id || m.matchId || JSON.stringify(m).slice(0, 40);
            // Parse teams data
            const teams = [];
            if ((_b = m.matchInfo) === null || _b === void 0 ? void 0 : _b.team1) {
                teams.push({
                    teamId: (_c = m.matchInfo.team1.teamId) === null || _c === void 0 ? void 0 : _c.toString(),
                    teamName: m.matchInfo.team1.teamName,
                    teamShortName: m.matchInfo.team1.teamSName,
                    score: {
                        runs: 0,
                        wickets: 0,
                        overs: 0
                    }
                });
            }
            if ((_d = m.matchInfo) === null || _d === void 0 ? void 0 : _d.team2) {
                teams.push({
                    teamId: (_e = m.matchInfo.team2.teamId) === null || _e === void 0 ? void 0 : _e.toString(),
                    teamName: m.matchInfo.team2.teamName,
                    teamShortName: m.matchInfo.team2.teamSName,
                    score: {
                        runs: 0,
                        wickets: 0,
                        overs: 0
                    }
                });
            }
            const doc = {
                matchId: matchId === null || matchId === void 0 ? void 0 : matchId.toString(),
                title: ((_f = m.matchInfo) === null || _f === void 0 ? void 0 : _f.matchDesc) || m.name || m.title || 'Match',
                shortTitle: ((_g = m.matchInfo) === null || _g === void 0 ? void 0 : _g.matchDesc) || m.shortName || m.title || 'Match',
                subTitle: ((_h = m.matchInfo) === null || _h === void 0 ? void 0 : _h.seriesName) || m.subtitle || '',
                format: ((_j = m.matchInfo) === null || _j === void 0 ? void 0 : _j.matchFormat) || 'OTHER',
                status: mapStatusToEnum(((_k = m.matchInfo) === null || _k === void 0 ? void 0 : _k.state) || m.status || 'UPCOMING'),
                venue: {
                    name: ((_m = (_l = m.matchInfo) === null || _l === void 0 ? void 0 : _l.venueInfo) === null || _m === void 0 ? void 0 : _m.ground) || m.venue || 'Unknown Venue',
                    city: ((_p = (_o = m.matchInfo) === null || _o === void 0 ? void 0 : _o.venueInfo) === null || _p === void 0 ? void 0 : _p.city) || m.city || '',
                    country: ((_r = (_q = m.matchInfo) === null || _q === void 0 ? void 0 : _q.venueInfo) === null || _r === void 0 ? void 0 : _r.country) || m.country || ''
                },
                startDate: ((_s = m.matchInfo) === null || _s === void 0 ? void 0 : _s.startDate) ? new Date(parseInt(m.matchInfo.startDate)) : new Date(),
                endDate: ((_t = m.matchInfo) === null || _t === void 0 ? void 0 : _t.endDate) ? new Date(parseInt(m.matchInfo.endDate)) : undefined,
                series: {
                    id: ((_v = (_u = m.matchInfo) === null || _u === void 0 ? void 0 : _u.seriesId) === null || _v === void 0 ? void 0 : _v.toString()) || '0',
                    name: ((_w = m.matchInfo) === null || _w === void 0 ? void 0 : _w.seriesName) || 'Unknown Series',
                    seriesType: 'INTERNATIONAL'
                },
                teams: teams,
                isLive: ((_x = m.matchInfo) === null || _x === void 0 ? void 0 : _x.state) === 'In Progress' || ((_y = m.matchInfo) === null || _y === void 0 ? void 0 : _y.state) === 'Complete' || false,
                priority: 0,
                raw: m
            };
            Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);
            return Match_1.default.findOneAndUpdate({ matchId: doc.matchId }, { $set: doc }, { upsert: true, new: true, setDefaultsOnInsert: true });
        });
        const results = await Promise.all(upsertPromises);
        res.json({ message: `Synced ${results.length} upcoming matches.`, count: results.length });
    }
    catch (error) {
        console.error('syncUpcomingMatchesFromRapidAPI error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Upcoming matches sync failed', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.syncUpcomingMatchesFromRapidAPI = syncUpcomingMatchesFromRapidAPI;
