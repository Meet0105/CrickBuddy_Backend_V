"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMatchTeamInfo = exports.getMatchInfo = void 0;
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
const getMatchInfo = async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_MATCHES_INFO_URL = process.env.RAPIDAPI_MATCHES_INFO_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_MATCHES_INFO_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_MATCHES_INFO_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch match info from Cricbuzz API
        const url = `${RAPIDAPI_MATCHES_INFO_URL}/${id}`;
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        // Save to database
        const m = response.data;
        const matchId = ((_a = m.matchInfo) === null || _a === void 0 ? void 0 : _a.matchId) || m.matchId || m.id || m.match_id || id;
        const format = ((_b = m.matchInfo) === null || _b === void 0 ? void 0 : _b.matchFormat) || ((_c = m.matchInfo) === null || _c === void 0 ? void 0 : _c.matchType) || m.format || m.type || m.matchType || 'Other';
        const team1 = ((_e = (_d = m.matchInfo) === null || _d === void 0 ? void 0 : _d.team1) === null || _e === void 0 ? void 0 : _e.teamName) || ((_g = (_f = m.matchInfo) === null || _f === void 0 ? void 0 : _f.team1) === null || _g === void 0 ? void 0 : _g.teamSName) || m.teamA || m.team1 || '';
        const team2 = ((_j = (_h = m.matchInfo) === null || _h === void 0 ? void 0 : _h.team2) === null || _j === void 0 ? void 0 : _j.teamName) || ((_l = (_k = m.matchInfo) === null || _k === void 0 ? void 0 : _k.team2) === null || _l === void 0 ? void 0 : _l.teamSName) || m.teamB || m.team2 || '';
        const status = mapStatusToEnum(((_m = m.matchInfo) === null || _m === void 0 ? void 0 : _m.status) || ((_o = m.matchInfo) === null || _o === void 0 ? void 0 : _o.state) || m.status || m.matchStatus || 'UPCOMING');
        const series = ((_p = m.matchInfo) === null || _p === void 0 ? void 0 : _p.seriesName) || ((_q = m.series) === null || _q === void 0 ? void 0 : _q.name) || m.tournament || '';
        const venue = ((_s = (_r = m.matchInfo) === null || _r === void 0 ? void 0 : _r.venueInfo) === null || _s === void 0 ? void 0 : _s.ground) || ((_t = m.matchInfo) === null || _t === void 0 ? void 0 : _t.venue) || m.venue || '';
        const result = ((_u = m.matchInfo) === null || _u === void 0 ? void 0 : _u.status) || m.status || '';
        const title = ((_v = m.matchInfo) === null || _v === void 0 ? void 0 : _v.matchDesc) || `${team1} vs ${team2}` || '';
        let startDate = null;
        let endDate = null;
        if ((_w = m.matchInfo) === null || _w === void 0 ? void 0 : _w.startDate)
            startDate = new Date(parseInt(m.matchInfo.startDate));
        else if (m.startDate)
            startDate = new Date(m.startDate);
        else if (m.date)
            startDate = new Date(m.date);
        if ((_x = m.matchInfo) === null || _x === void 0 ? void 0 : _x.endDate)
            endDate = new Date(parseInt(m.matchInfo.endDate));
        else if (m.endDate)
            endDate = new Date(m.endDate);
        const innings = ((_y = m.matchScore) === null || _y === void 0 ? void 0 : _y.scoreData) || m.innings || [];
        const doc = {
            matchId: matchId === null || matchId === void 0 ? void 0 : matchId.toString(),
            format: format || 'Other',
            title,
            series,
            team1: typeof team1 === 'object' ? team1.name || team1.teamName || '' : team1,
            team2: typeof team2 === 'object' ? team2.name || team2.teamName || '' : team2,
            status,
            venue,
            innings,
            startDate: startDate && !isNaN(startDate.getTime()) ? startDate : undefined,
            endDate: endDate && !isNaN(endDate.getTime()) ? endDate : undefined,
            result,
            isLive: status === 'LIVE',
            raw: m
        };
        Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);
        const updatedMatch = await Match_1.default.findOneAndUpdate({ matchId: doc.matchId }, { $set: doc }, { upsert: true, new: true, setDefaultsOnInsert: true });
        res.json(updatedMatch);
    }
    catch (error) {
        console.error('getMatchInfo error:', error);
        // Handle rate limiting
        if (((_z = error === null || error === void 0 ? void 0 : error.response) === null || _z === void 0 ? void 0 : _z.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch match info', error: error.message });
    }
};
exports.getMatchInfo = getMatchInfo;
const getMatchTeamInfo = async (req, res) => {
    var _a;
    try {
        const { id, teamId } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_MATCHES_INFO_URL = process.env.RAPIDAPI_MATCHES_INFO_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_MATCHES_INFO_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_MATCHES_INFO_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch match team info from Cricbuzz API
        const url = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/team/${teamId}`;
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getMatchTeamInfo error:', error);
        // Handle rate limiting
        if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch match team info', error: error.message });
    }
};
exports.getMatchTeamInfo = getMatchTeamInfo;
