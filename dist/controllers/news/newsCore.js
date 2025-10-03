"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNewsById = exports.getAllNews = void 0;
const News_1 = __importDefault(require("../../models/News"));
// Function to get all news - first check database, then API if needed
const getAllNews = async (req, res) => {
    var _a, _b;
    try {
        const { limit = '20', page = '1' } = req.query;
        // First, try to get news from database
        const skip = (Number(page) - 1) * Number(limit);
        const newsFromDB = await News_1.default.find({})
            .sort({ publishedDate: -1 })
            .limit(Number(limit))
            .skip(skip)
            .select('-content'); // Exclude full content for list view
        const total = await News_1.default.countDocuments({});
        // Return news with pagination info
        const response = {
            news: newsFromDB,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        };
        // If we have news in the database, return them
        if (newsFromDB && newsFromDB.length > 0) {
            return res.json(response);
        }
        // If no news in database, return empty response
        res.json({
            news: [],
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: 0,
                pages: 0
            }
        });
    }
    catch (error) {
        console.error('getAllNews error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        res.status(500).json({ message: 'Failed to fetch news', error: ((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message });
    }
};
exports.getAllNews = getAllNews;
// Function to get news by ID - first check database, then API if needed
const getNewsById = async (req, res) => {
    var _a, _b;
    try {
        const { id } = req.params;
        // First, try to get news from database
        const newsFromDB = await News_1.default.findOne({ newsId: id });
        // If we have the news in the database, return it
        if (newsFromDB) {
            return res.json(newsFromDB);
        }
        // If news not in database, return 404
        res.status(404).json({ message: 'News not found' });
    }
    catch (error) {
        console.error('getNewsById error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        res.status(500).json({ message: 'Failed to fetch news', error: ((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message });
    }
};
exports.getNewsById = getNewsById;
