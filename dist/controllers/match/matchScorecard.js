"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMatchScorecardV2 = exports.getMatchScorecard = void 0;
const axios_1 = __importDefault(require("axios"));
const Match_1 = __importDefault(require("../../models/Match"));
// Helper function to map API status to our enum values
const mapStatusToEnum = (status) => {
    console.log(`mapStatusToEnum called with: "${status}"`);
    if (!status) {
        console.log('No status provided, returning UPCOMING');
        return 'UPCOMING';
    }
    // Convert to lowercase for case-insensitive comparison
    const lowerStatus = status.toLowerCase();
    console.log(`Lowercase status: "${lowerStatus}"`);
    // Map LIVE status patterns
    if (lowerStatus.includes('live') ||
        lowerStatus.includes('in progress') ||
        lowerStatus.includes('innings break') ||
        lowerStatus.includes('rain delay') ||
        lowerStatus.includes('tea break') ||
        lowerStatus.includes('lunch break') ||
        lowerStatus.includes('drinks break') ||
        lowerStatus === 'live') {
        console.log('Mapped to LIVE');
        return 'LIVE';
    }
    // Map COMPLETED status patterns
    if (lowerStatus.includes('complete') ||
        lowerStatus.includes('finished') ||
        lowerStatus.includes('won by') ||
        lowerStatus.includes('match tied') ||
        lowerStatus.includes('no result') ||
        lowerStatus.includes('result') ||
        lowerStatus === 'completed' ||
        lowerStatus === 'finished') {
        console.log('Mapped to COMPLETED');
        return 'COMPLETED';
    }
    // Map ABANDONED status patterns
    if (lowerStatus.includes('abandon') ||
        lowerStatus.includes('washed out') ||
        lowerStatus === 'abandoned') {
        console.log('Mapped to ABANDONED');
        return 'ABANDONED';
    }
    // Map CANCELLED status patterns
    if (lowerStatus.includes('cancel') ||
        lowerStatus.includes('postponed') ||
        lowerStatus === 'cancelled') {
        console.log('Mapped to CANCELLED');
        return 'CANCELLED';
    }
    // Map UPCOMING status patterns
    if (lowerStatus.includes('match starts') ||
        lowerStatus.includes('starts at') ||
        lowerStatus.includes('upcoming') ||
        lowerStatus.includes('scheduled') ||
        lowerStatus.includes('preview') ||
        lowerStatus === 'upcoming' ||
        lowerStatus === 'scheduled') {
        console.log('Mapped to UPCOMING');
        return 'UPCOMING';
    }
    // If we can't determine the status, try to make an educated guess
    // Check if it contains time information (likely upcoming)
    if (lowerStatus.match(/\d{1,2}:\d{2}/) || lowerStatus.includes('gmt') || lowerStatus.includes('ist')) {
        console.log('Contains time info - mapped to UPCOMING');
        return 'UPCOMING';
    }
    // Default fallback - but log it for investigation
    console.log(`⚠️ UNMAPPED STATUS: "${status}" - defaulting to UPCOMING. Please add this pattern to the mapping function.`);
    return 'UPCOMING';
};
// Helper function to safely update match status with retry logic
const updateMatchStatus = async (matchId, status) => {
    let retries = 3;
    while (retries > 0) {
        try {
            const result = await Match_1.default.findOneAndUpdate({ matchId: matchId }, { $set: { status: status, isLive: status === 'LIVE' } }, { new: true });
            return result;
        }
        catch (error) {
            if (error.name === 'VersionError' && retries > 1) {
                console.log(`VersionError occurred, retrying... (${retries - 1} retries left)`);
                retries--;
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            else {
                throw error;
            }
        }
    }
};
// Helper function to safely save match data with retry logic
const saveMatchWithRetry = async (match) => {
    let retries = 3;
    while (retries > 0) {
        try {
            await match.save();
            return;
        }
        catch (error) {
            if (error.name === 'VersionError' && retries > 1) {
                console.log(`VersionError occurred during save, retrying... (${retries - 1} retries left)`);
                retries--;
                // Instead of reload(), we need to fetch the document again from the database
                const freshMatch = await Match_1.default.findById(match._id);
                if (freshMatch) {
                    // Copy the modified fields from the old document to the fresh one
                    Object.assign(freshMatch, match);
                    match = freshMatch;
                }
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            else {
                throw error;
            }
        }
    }
};
const getMatchScorecard = async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    try {
        const { id } = req.params;
        // First, try to get scorecard from database
        const matchFromDB = await Match_1.default.findOne({ matchId: id });
        if (matchFromDB && matchFromDB.scorecard && matchFromDB.scorecard.scorecard && matchFromDB.scorecard.scorecard.length > 0) {
            console.log('Returning scorecard from database');
            return res.json(matchFromDB.scorecard);
        }
        // Check if match is truly upcoming (not started yet) and handle gracefully
        if (matchFromDB) {
            const currentTime = new Date();
            const matchStartTime = matchFromDB.startDate;
            // Only consider it upcoming if:
            // 1. Start date is in the future, OR
            // 2. Status is UPCOMING AND start date is more than 1 hour in the past (to handle delays)
            const isTrulyUpcoming = (matchStartTime && matchStartTime > currentTime) ||
                (matchFromDB.status === 'UPCOMING' &&
                    matchStartTime &&
                    (currentTime.getTime() - matchStartTime.getTime()) > (60 * 60 * 1000)); // More than 1 hour past start time
            if (isTrulyUpcoming) {
                console.log(`Match ${id} is truly upcoming, scorecard not available yet`);
                return res.json({
                    message: 'Scorecard not available yet - match has not started',
                    matchStatus: matchFromDB.status,
                    startDate: matchFromDB.startDate,
                    scorecard: null
                });
            }
            else if (matchFromDB.status === 'UPCOMING' && matchStartTime && matchStartTime <= currentTime) {
                // Match should be live based on time - update status
                console.log(`⚡ Match ${id} should be live based on start time, updating status`);
                await updateMatchStatus(id, 'LIVE');
                // Refresh the document by fetching it again from the database
                const updatedMatch = await Match_1.default.findOne({ matchId: id });
                if (updatedMatch) {
                    Object.assign(matchFromDB, updatedMatch);
                }
            }
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
        // Try to fetch match scorecard from Cricbuzz API
        const url = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/scard`;
        console.log('Fetching scorecard from API:', url);
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        // Store scorecard data in database
        if (response.data && matchFromDB) {
            console.log('Storing scorecard data in database');
            matchFromDB.scorecard = response.data;
            await saveMatchWithRetry(matchFromDB);
        }
        else if (response.data && !matchFromDB) {
            // Extract status from the API response
            let status = 'UPCOMING';
            console.log('Raw API response matchHeader:', JSON.stringify(response.data.matchHeader, null, 2));
            console.log('All response.data keys:', Object.keys(response.data));
            console.log('Looking for status-like fields:', {
                state: (_a = response.data.matchHeader) === null || _a === void 0 ? void 0 : _a.state,
                status: (_b = response.data.matchHeader) === null || _b === void 0 ? void 0 : _b.status,
                statusText: (_c = response.data.matchHeader) === null || _c === void 0 ? void 0 : _c.statusText,
                matchStatus: (_d = response.data.matchHeader) === null || _d === void 0 ? void 0 : _d.matchStatus,
                description: (_e = response.data.matchHeader) === null || _e === void 0 ? void 0 : _e.matchDescription
            });
            if (response.data.matchHeader && response.data.matchHeader.state) {
                console.log('Using state:', response.data.matchHeader.state);
                status = mapStatusToEnum(response.data.matchHeader.state);
            }
            else if (response.data.matchHeader && response.data.matchHeader.status) {
                console.log('Using status:', response.data.matchHeader.status);
                status = mapStatusToEnum(response.data.matchHeader.status);
            }
            else if (response.data.matchHeader && response.data.matchHeader.statusText) {
                console.log('Using statusText:', response.data.matchHeader.statusText);
                status = mapStatusToEnum(response.data.matchHeader.statusText);
            }
            else if (response.data.matchHeader && response.data.matchHeader.matchStatus) {
                console.log('Using matchStatus:', response.data.matchHeader.matchStatus);
                status = mapStatusToEnum(response.data.matchHeader.matchStatus);
            }
            else if (response.data.matchHeader && response.data.matchHeader.matchDescription) {
                console.log('Using matchDescription:', response.data.matchHeader.matchDescription);
                status = mapStatusToEnum(response.data.matchHeader.matchDescription);
            }
            console.log('Final mapped status:', status);
            // Create new match entry with scorecard data
            console.log('Creating new match entry with scorecard data');
            const newMatch = new Match_1.default({
                matchId: id,
                title: ((_f = response.data.matchHeader) === null || _f === void 0 ? void 0 : _f.matchDescription) || `Match ${id}`,
                format: ((_g = response.data.matchHeader) === null || _g === void 0 ? void 0 : _g.matchFormat) || 'OTHER',
                status: status,
                venue: {
                    name: ((_h = response.data.matchHeader) === null || _h === void 0 ? void 0 : _h.venueName) || 'Unknown Venue',
                    city: ((_j = response.data.matchHeader) === null || _j === void 0 ? void 0 : _j.venueCity) || '',
                    country: ((_k = response.data.matchHeader) === null || _k === void 0 ? void 0 : _k.venueCountry) || ''
                },
                startDate: ((_l = response.data.matchHeader) === null || _l === void 0 ? void 0 : _l.startDate) ? new Date(response.data.matchHeader.startDate) : new Date(),
                series: {
                    id: ((_o = (_m = response.data.matchHeader) === null || _m === void 0 ? void 0 : _m.seriesId) === null || _o === void 0 ? void 0 : _o.toString()) || '0',
                    name: ((_p = response.data.matchHeader) === null || _p === void 0 ? void 0 : _p.seriesName) || 'Unknown Series'
                },
                teams: [],
                scorecard: response.data,
                raw: response.data
            });
            await saveMatchWithRetry(newMatch);
        }
        res.json(response.data);
    }
    catch (error) {
        console.error('getMatchScorecard error:', error);
        // Handle rate limiting
        if (((_q = error === null || error === void 0 ? void 0 : error.response) === null || _q === void 0 ? void 0 : _q.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        // Handle API errors for upcoming matches
        if (((_r = error === null || error === void 0 ? void 0 : error.response) === null || _r === void 0 ? void 0 : _r.status) === 404 || ((_s = error === null || error === void 0 ? void 0 : error.response) === null || _s === void 0 ? void 0 : _s.status) === 400) {
            return res.json({
                message: 'Scorecard not available - match may not have started yet',
                scorecard: null
            });
        }
        // Handle validation errors (like status enum issues)
        if ((error === null || error === void 0 ? void 0 : error.name) === 'ValidationError') {
            console.log('Validation error - likely upcoming match with invalid status');
            return res.json({
                message: 'Scorecard not available yet - match has not started',
                scorecard: null
            });
        }
        res.status(500).json({ message: 'Failed to fetch match scorecard', error: error.message });
    }
};
exports.getMatchScorecard = getMatchScorecard;
const getMatchScorecardV2 = async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    try {
        const { id } = req.params;
        // First, try to get historical scorecard from database
        const matchFromDB = await Match_1.default.findOne({ matchId: id });
        if (matchFromDB && matchFromDB.historicalScorecard && matchFromDB.historicalScorecard.scoreCard && matchFromDB.historicalScorecard.scoreCard.length > 0) {
            console.log('Returning historical scorecard from database');
            return res.json(matchFromDB.historicalScorecard);
        }
        // Check if match is truly upcoming (not started yet) and handle gracefully
        if (matchFromDB) {
            const currentTime = new Date();
            const matchStartTime = matchFromDB.startDate;
            // Only consider it upcoming if:
            // 1. Start date is in the future, OR
            // 2. Status is UPCOMING AND start date is more than 1 hour in the past (to handle delays)
            const isTrulyUpcoming = (matchStartTime && matchStartTime > currentTime) ||
                (matchFromDB.status === 'UPCOMING' &&
                    matchStartTime &&
                    (currentTime.getTime() - matchStartTime.getTime()) > (60 * 60 * 1000)); // More than 1 hour past start time
            if (isTrulyUpcoming) {
                console.log(`Match ${id} is truly upcoming, historical scorecard not available yet`);
                return res.json({
                    message: 'Historical scorecard not available yet - match has not started',
                    matchStatus: matchFromDB.status,
                    startDate: matchFromDB.startDate,
                    scoreCard: null
                });
            }
            else if (matchFromDB.status === 'UPCOMING' && matchStartTime && matchStartTime <= currentTime) {
                // Match should be live based on time - update status
                console.log(`⚡ Match ${id} should be live based on start time, updating status for historical scorecard`);
                await updateMatchStatus(id, 'LIVE');
                // Refresh the document by fetching it again from the database
                const updatedMatch = await Match_1.default.findOne({ matchId: id });
                if (updatedMatch) {
                    Object.assign(matchFromDB, updatedMatch);
                }
            }
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
        // Try to fetch match scorecard v2 from Cricbuzz API
        const url = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/hscard`;
        console.log('Fetching historical scorecard from API:', url);
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        // Store historical scorecard data in database
        if (response.data && matchFromDB) {
            console.log('Storing historical scorecard data in database');
            matchFromDB.historicalScorecard = response.data;
            await saveMatchWithRetry(matchFromDB);
        }
        else if (response.data && !matchFromDB) {
            // Extract status from the API response
            let status = 'UPCOMING';
            console.log('Raw API response matchHeader (historical):', JSON.stringify(response.data.matchHeader, null, 2));
            if (response.data.matchHeader && response.data.matchHeader.state) {
                console.log('Using state (historical):', response.data.matchHeader.state);
                status = mapStatusToEnum(response.data.matchHeader.state);
            }
            else if (response.data.matchHeader && response.data.matchHeader.status) {
                console.log('Using status (historical):', response.data.matchHeader.status);
                status = mapStatusToEnum(response.data.matchHeader.status);
            }
            else if (response.data.matchHeader && response.data.matchHeader.statusText) {
                console.log('Using statusText (historical):', response.data.matchHeader.statusText);
                status = mapStatusToEnum(response.data.matchHeader.statusText);
            }
            else if (response.data.matchHeader && response.data.matchHeader.matchStatus) {
                console.log('Using matchStatus (historical):', response.data.matchHeader.matchStatus);
                status = mapStatusToEnum(response.data.matchHeader.matchStatus);
            }
            else if (response.data.matchHeader && response.data.matchHeader.matchDescription) {
                console.log('Using matchDescription (historical):', response.data.matchHeader.matchDescription);
                status = mapStatusToEnum(response.data.matchHeader.matchDescription);
            }
            console.log('Final mapped status (historical):', status);
            // Create new match entry with historical scorecard data
            console.log('Creating new match entry with historical scorecard data');
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
                historicalScorecard: response.data,
                raw: response.data
            });
            await saveMatchWithRetry(newMatch);
        }
        res.json(response.data);
    }
    catch (error) {
        console.error('getMatchScorecardV2 error:', error);
        // Handle rate limiting
        if (((_k = error === null || error === void 0 ? void 0 : error.response) === null || _k === void 0 ? void 0 : _k.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        // Handle API errors for upcoming matches
        if (((_l = error === null || error === void 0 ? void 0 : error.response) === null || _l === void 0 ? void 0 : _l.status) === 404 || ((_m = error === null || error === void 0 ? void 0 : error.response) === null || _m === void 0 ? void 0 : _m.status) === 400) {
            return res.json({
                message: 'Historical scorecard not available - match may not have started yet',
                scoreCard: null
            });
        }
        // Handle validation errors (like status enum issues)
        if ((error === null || error === void 0 ? void 0 : error.name) === 'ValidationError') {
            console.log('Validation error - likely upcoming match with invalid status');
            return res.json({
                message: 'Historical scorecard not available yet - match has not started',
                scoreCard: null
            });
        }
        res.status(500).json({ message: 'Failed to fetch match scorecard v2', error: error.message });
    }
};
exports.getMatchScorecardV2 = getMatchScorecardV2;
