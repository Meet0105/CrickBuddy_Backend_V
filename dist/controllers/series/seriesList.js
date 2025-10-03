"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSeriesArchives = exports.getSeriesList = void 0;
const axios_1 = __importDefault(require("axios"));
const Series_1 = __importDefault(require("../../models/Series"));
// New function to get series list - first check database, then API if needed
const getSeriesList = async (req, res) => {
    var _a, _b, _c;
    try {
        // First, try to get series from database
        const seriesFromDB = await Series_1.default.find({ isActive: true }).sort({ priority: -1, startDate: -1 }).limit(100);
        // If we have series in the database, return them
        if (seriesFromDB && seriesFromDB.length > 0) {
            // Transform the data to include all fields including squads and points table
            const seriesData = seriesFromDB.map(series => ({
                seriesId: series.seriesId,
                name: series.name,
                shortName: series.shortName,
                description: series.description || '',
                seriesType: series.seriesType,
                startDate: series.startDate,
                endDate: series.endDate,
                venue: series.venue,
                teams: series.teams,
                status: series.status,
                format: series.format,
                totalMatches: series.totalMatches,
                completedMatches: series.completedMatches,
                isActive: series.isActive,
                priority: series.priority,
                featuredImage: series.featuredImage,
                sponsors: series.sponsors,
                squads: series.squads || [],
                pointsTable: series.pointsTable || [],
                schedule: series.schedule || []
            }));
            return res.json(seriesData);
        }
        // If no series in database and no API key, return empty data
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_SERIES_LIST_URL = process.env.RAPIDAPI_SERIES_LIST_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_LIST_URL) {
            // If API key is missing, return empty data instead of trying to fetch from API
            return res.json({ seriesMapProto: [] });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch series list from Cricbuzz API
        const response = await axios_1.default.get(RAPIDAPI_SERIES_LIST_URL, { headers, timeout: 15000 });
        // Store series data in database for future offline use
        try {
            if (response.data && response.data.seriesMapProto) {
                for (const series of response.data.seriesMapProto) {
                    await Series_1.default.findOneAndUpdate({ seriesId: (_a = series.seriesId) === null || _a === void 0 ? void 0 : _a.toString() }, {
                        seriesId: (_b = series.seriesId) === null || _b === void 0 ? void 0 : _b.toString(),
                        name: series.name || 'Unknown Series',
                        shortName: series.shortName || '',
                        description: series.description || '',
                        seriesType: series.seriesType || 'International',
                        startDate: series.startDate ? new Date(series.startDate) : new Date(),
                        endDate: series.endDate ? new Date(series.endDate) : new Date(),
                        venue: series.venue || '',
                        teams: series.teams || [],
                        status: series.status || 'upcoming',
                        format: series.format || 'mixed',
                        totalMatches: series.totalMatches || 0,
                        completedMatches: series.completedMatches || 0,
                        isActive: true,
                        priority: series.priority || 0,
                        featuredImage: series.featuredImage || null,
                        sponsors: series.sponsors || [],
                        lastSync: new Date()
                    }, { upsert: true, new: true });
                }
                console.log(`Stored ${response.data.seriesMapProto.length} series in database`);
            }
        }
        catch (dbError) {
            console.error('Error storing series in database:', dbError);
        }
        res.json(response.data);
    }
    catch (error) {
        console.error('getSeriesList error:', error);
        // Handle rate limiting
        if (((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        // Fallback to empty data on error
        res.json({ seriesMapProto: [] });
    }
};
exports.getSeriesList = getSeriesList;
// New function to get series archives - first check database, then API if needed
const getSeriesArchives = async (req, res) => {
    var _a, _b, _c;
    try {
        // First, try to get series from database
        const seriesFromDB = await Series_1.default.find({ isActive: false }).sort({ priority: -1, startDate: -1 }).limit(100);
        // If we have series in the database, return them
        if (seriesFromDB && seriesFromDB.length > 0) {
            // Transform the data to include all fields including squads and points table
            const seriesData = seriesFromDB.map(series => ({
                seriesId: series.seriesId,
                name: series.name,
                shortName: series.shortName,
                description: series.description || '',
                seriesType: series.seriesType,
                startDate: series.startDate,
                endDate: series.endDate,
                venue: series.venue,
                teams: series.teams,
                status: series.status,
                format: series.format,
                totalMatches: series.totalMatches,
                completedMatches: series.completedMatches,
                isActive: series.isActive,
                priority: series.priority,
                featuredImage: series.featuredImage,
                sponsors: series.sponsors,
                squads: series.squads || [],
                pointsTable: series.pointsTable || [],
                schedule: series.schedule || []
            }));
            return res.json(seriesData);
        }
        // If no series in database and no API key, return empty data
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_SERIES_ARCHIVES_URL = process.env.RAPIDAPI_SERIES_ARCHIVES_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_ARCHIVES_URL) {
            // If API key is missing, return empty data instead of trying to fetch from API
            return res.json({ seriesMapProto: [] });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch series archives from Cricbuzz API
        const response = await axios_1.default.get(RAPIDAPI_SERIES_ARCHIVES_URL, { headers, timeout: 15000 });
        // Store archived series data in database for future offline use
        try {
            if (response.data && response.data.seriesMapProto) {
                for (const series of response.data.seriesMapProto) {
                    await Series_1.default.findOneAndUpdate({ seriesId: (_a = series.seriesId) === null || _a === void 0 ? void 0 : _a.toString() }, {
                        seriesId: (_b = series.seriesId) === null || _b === void 0 ? void 0 : _b.toString(),
                        name: series.name || 'Unknown Series',
                        shortName: series.shortName || '',
                        description: series.description || '',
                        seriesType: series.seriesType || 'International',
                        startDate: series.startDate ? new Date(series.startDate) : new Date(),
                        endDate: series.endDate ? new Date(series.endDate) : new Date(),
                        venue: series.venue || '',
                        teams: series.teams || [],
                        status: series.status || 'completed',
                        format: series.format || 'mixed',
                        totalMatches: series.totalMatches || 0,
                        completedMatches: series.completedMatches || 0,
                        isActive: false,
                        priority: series.priority || 0,
                        featuredImage: series.featuredImage || null,
                        sponsors: series.sponsors || [],
                        lastSync: new Date()
                    }, { upsert: true, new: true });
                }
                console.log(`Stored ${response.data.seriesMapProto.length} archived series in database`);
            }
        }
        catch (dbError) {
            console.error('Error storing archived series in database:', dbError);
        }
        res.json(response.data);
    }
    catch (error) {
        console.error('getSeriesArchives error:', error);
        // Handle rate limiting
        if (((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        // Fallback to empty data on error
        res.json({ seriesMapProto: [] });
    }
};
exports.getSeriesArchives = getSeriesArchives;
