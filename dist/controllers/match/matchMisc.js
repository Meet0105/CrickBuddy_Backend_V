"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncAllDataFromRapidAPI = exports.clearDemoData = exports.updateMatchDemo = exports.getMatchLeanback = exports.getMatchOvers = void 0;
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
const getMatchOvers = async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        const { id } = req.params;
        // First, try to get overs from database
        const matchFromDB = await Match_1.default.findOne({ matchId: id });
        if (matchFromDB && matchFromDB.overs && matchFromDB.overs.overs && matchFromDB.overs.overs.length > 0) {
            console.log('Returning overs from database');
            return res.json(matchFromDB.overs);
        }
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
        // Try to fetch match overs from Cricbuzz API
        const url = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/overs`;
        console.log('Fetching overs from API:', url);
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        // Store overs data in database
        if (response.data && matchFromDB) {
            console.log('Storing overs data in database');
            matchFromDB.overs = {
                ...response.data,
                lastUpdated: new Date()
            };
            await matchFromDB.save();
        }
        else if (response.data && !matchFromDB) {
            // Extract status from the API response
            let status = 'UPCOMING';
            if (response.data.matchHeader && response.data.matchHeader.state) {
                status = mapStatusToEnum(response.data.matchHeader.state);
            }
            else if (response.data.matchHeader && response.data.matchHeader.status) {
                status = mapStatusToEnum(response.data.matchHeader.status);
            }
            // Create new match entry with overs data
            console.log('Creating new match entry with overs data');
            const newMatch = new Match_1.default({
                matchId: id,
                title: ((_a = response.data.matchHeader) === null || _a === void 0 ? void 0 : _a.matchDescription) || `Match ${id}`,
                format: ((_b = response.data.matchHeader) === null || _b === void 0 ? void 0 : _b.matchFormat) || 'OTHER',
                status: status,
                venue: {
                    name: ((_c = response.data.matchHeader) === null || _c === void 0 ? void 0 : _c.venueName) || 'Unknown Venue',
                    city: ((_d = response.data.matchHeader) === null || _d === void 0 ? void 0 : _d.venueCity) || '',
                    country: ((_e = response.data.matchHeader) === null || _e === void 0 ? void 0 : _e.venueCountry) || ''
                },
                startDate: ((_f = response.data.matchHeader) === null || _f === void 0 ? void 0 : _f.startDate) ? new Date(response.data.matchHeader.startDate) : new Date(),
                series: {
                    id: ((_h = (_g = response.data.matchHeader) === null || _g === void 0 ? void 0 : _g.seriesId) === null || _h === void 0 ? void 0 : _h.toString()) || '0',
                    name: ((_j = response.data.matchHeader) === null || _j === void 0 ? void 0 : _j.seriesName) || 'Unknown Series'
                },
                teams: [],
                overs: {
                    ...response.data,
                    lastUpdated: new Date()
                },
                raw: response.data
            });
            await newMatch.save();
        }
        res.json(response.data);
    }
    catch (error) {
        console.error('getMatchOvers error:', error);
        // Handle rate limiting
        if (((_k = error === null || error === void 0 ? void 0 : error.response) === null || _k === void 0 ? void 0 : _k.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch match overs', error: error.message });
    }
};
exports.getMatchOvers = getMatchOvers;
const getMatchLeanback = async (req, res) => {
    var _a;
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
        // Try to fetch match leanback from Cricbuzz API
        const url = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/leanback`;
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getMatchLeanback error:', error);
        // Handle rate limiting
        if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch match leanback', error: error.message });
    }
};
exports.getMatchLeanback = getMatchLeanback;
const updateMatchDemo = async (req, res) => {
    try {
        const { matchId, isLive, status } = req.body;
        const match = await Match_1.default.findOne({ matchId });
        if (!match) {
            return res.status(404).json({ message: 'Match not found' });
        }
        if (isLive !== undefined)
            match.isLive = isLive;
        if (status)
            match.status = status;
        await match.save();
        res.json({ message: 'Match updated successfully', match });
    }
    catch (error) {
        console.error('updateMatchDemo error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.updateMatchDemo = updateMatchDemo;
const clearDemoData = async (req, res) => {
    try {
        // Clear existing demo data
        const result = await Match_1.default.deleteMany({ matchId: { $regex: 'demo-', $options: 'i' } });
        res.json({
            message: `Demo data cleared successfully`,
            deletedCount: result.deletedCount
        });
    }
    catch (error) {
        console.error('clearDemoData error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.clearDemoData = clearDemoData;
// New function to sync all data from RapidAPI
const syncAllDataFromRapidAPI = async (req, res) => {
    try {
        // We'll implement this function to sync all data types
        res.json({
            message: 'Full sync endpoint ready. Please sync each data type separately using their respective endpoints.',
            endpoints: {
                matches: 'POST /api/matches/sync',
                news: 'POST /api/news/sync',
                players: 'POST /api/players/sync',
                series: 'POST /api/series/sync',
                teams: 'POST /api/teams/sync'
            }
        });
    }
    catch (error) {
        console.error('syncAllDataFromRapidAPI error:', error);
        res.status(500).json({ message: 'Full sync failed', error: error.message });
    }
};
exports.syncAllDataFromRapidAPI = syncAllDataFromRapidAPI;
