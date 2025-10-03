"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMatchCommentariesV2 = exports.getMatchCommentaries = void 0;
const axios_1 = __importDefault(require("axios"));
const Match_1 = __importDefault(require("../../models/Match"));
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
const getMatchCommentaries = async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        const { id } = req.params;
        // First, try to get commentary from database
        const matchFromDB = await Match_1.default.findOne({ matchId: id });
        if (matchFromDB && matchFromDB.commentary && matchFromDB.commentary.commentaryList && matchFromDB.commentary.commentaryList.length > 0) {
            console.log('Returning commentary from database');
            return res.json(matchFromDB.commentary);
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
        // Try to fetch match commentaries from Cricbuzz API
        const url = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/comm`;
        console.log('Fetching commentary from API:', url);
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        // Store commentary data in database
        if (response.data && matchFromDB) {
            console.log('Storing commentary data in database');
            matchFromDB.commentary = {
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
            // Create new match entry with commentary data
            console.log('Creating new match entry with commentary data');
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
                commentary: {
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
        console.error('getMatchCommentaries error:', error);
        // Handle rate limiting
        if (((_k = error === null || error === void 0 ? void 0 : error.response) === null || _k === void 0 ? void 0 : _k.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch match commentaries', error: error.message });
    }
};
exports.getMatchCommentaries = getMatchCommentaries;
const getMatchCommentariesV2 = async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        const { id } = req.params;
        // First, try to get historical commentary from database
        const matchFromDB = await Match_1.default.findOne({ matchId: id });
        if (matchFromDB && matchFromDB.historicalCommentary && matchFromDB.historicalCommentary.commentaryList && matchFromDB.historicalCommentary.commentaryList.length > 0) {
            console.log('Returning historical commentary from database');
            return res.json(matchFromDB.historicalCommentary);
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
        // Try to fetch match commentaries v2 from Cricbuzz API
        const url = `${RAPIDAPI_MATCHES_INFO_URL}/${id}/hcomm`;
        console.log('Fetching historical commentary from API:', url);
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        // Store historical commentary data in database
        if (response.data && matchFromDB) {
            console.log('Storing historical commentary data in database');
            matchFromDB.historicalCommentary = {
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
            // Create new match entry with historical commentary data
            console.log('Creating new match entry with historical commentary data');
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
                historicalCommentary: {
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
        console.error('getMatchCommentariesV2 error:', error);
        // Handle rate limiting
        if (((_k = error === null || error === void 0 ? void 0 : error.response) === null || _k === void 0 ? void 0 : _k.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch match commentaries v2', error: error.message });
    }
};
exports.getMatchCommentariesV2 = getMatchCommentariesV2;
