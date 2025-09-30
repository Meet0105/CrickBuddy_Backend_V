"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSeriesByType = exports.getActiveSeries = exports.getSeriesStandings = exports.getSeriesById = exports.getAllSeries = void 0;
const Series_1 = __importDefault(require("../../models/Series"));
// Function to get all series - first check database, then API if needed
const getAllSeries = async (req, res) => {
    var _a, _b;
    try {
        // First, try to get series from database
        const seriesFromDB = await Series_1.default.find({}).sort({ startDate: -1 }).limit(100);
        // If we have series in the database, return them
        if (seriesFromDB && seriesFromDB.length > 0) {
            return res.json(seriesFromDB);
        }
        // If no series in database, we would normally fetch from API
        // But for now, let's return empty array since we don't want to overload the API
        res.json([]);
    }
    catch (error) {
        console.error('getAllSeries error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        res.status(500).json({ message: 'Failed to fetch series', error: ((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message });
    }
};
exports.getAllSeries = getAllSeries;
// Function to get series by ID - first check database, then API if needed
const getSeriesById = async (req, res) => {
    var _a, _b;
    try {
        const { id } = req.params;
        // First, try to get series from database
        const seriesFromDB = await Series_1.default.findOne({ seriesId: id });
        // If we have the series in the database, return it
        if (seriesFromDB) {
            return res.json(seriesFromDB);
        }
        // If series not in database, return 404
        res.status(404).json({ message: 'Series not found' });
    }
    catch (error) {
        console.error('getSeriesById error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        res.status(500).json({ message: 'Failed to fetch series', error: ((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message });
    }
};
exports.getSeriesById = getSeriesById;
const getSeriesStandings = async (req, res) => {
    var _a;
    try {
        const series = await Series_1.default.findOne({ seriesId: req.params.id })
            .select('standings teams name shortName');
        if (!series)
            return res.status(404).json({ message: 'Series not found' });
        // Sort standings by points, then by net run rate
        const sortedStandings = (_a = series.standings) === null || _a === void 0 ? void 0 : _a.sort((a, b) => {
            if (b.points !== a.points)
                return b.points - a.points;
            return (b.netRunRate || 0) - (a.netRunRate || 0);
        });
        res.json({
            seriesName: series.name,
            standings: sortedStandings
        });
    }
    catch (error) {
        console.error('getSeriesStandings error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.getSeriesStandings = getSeriesStandings;
const getActiveSeries = async (req, res) => {
    try {
        const activeSeries = await Series_1.default.find({
            status: { $in: ['ONGOING', 'UPCOMING'] },
            isActive: true
        })
            .sort({ priority: -1, startDate: 1 })
            .limit(10)
            .select('seriesId name shortName startDate endDate seriesType format totalMatches completedMatches featuredImage');
        res.json(activeSeries);
    }
    catch (error) {
        console.error('getActiveSeries error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.getActiveSeries = getActiveSeries;
const getSeriesByType = async (req, res) => {
    try {
        const { type } = req.params;
        const { limit = 10 } = req.query;
        const series = await Series_1.default.find({
            seriesType: type.toUpperCase(),
            isActive: true
        })
            .sort({ priority: -1, startDate: -1 })
            .limit(Number(limit))
            .select('seriesId name shortName startDate endDate status format featuredImage');
        res.json(series);
    }
    catch (error) {
        console.error('getSeriesByType error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.getSeriesByType = getSeriesByType;
