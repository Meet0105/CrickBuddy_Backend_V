"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchNews = exports.getNewsByCategory = exports.getFeaturedNews = exports.getBreakingNews = void 0;
const News_1 = __importDefault(require("../../models/News"));
const getBreakingNews = async (req, res) => {
    try {
        const breakingNews = await News_1.default.find({ isBreaking: true })
            .sort({ priority: -1, publishedDate: -1 })
            .limit(5)
            .select('newsId headline subHeadline publishedDate featuredImage');
        res.json(breakingNews);
    }
    catch (error) {
        console.error('getBreakingNews error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.getBreakingNews = getBreakingNews;
const getFeaturedNews = async (req, res) => {
    try {
        const featuredNews = await News_1.default.find({ isFeatured: true })
            .sort({ priority: -1, publishedDate: -1 })
            .limit(10)
            .select('newsId headline subHeadline summary publishedDate featuredImage author readTime');
        res.json(featuredNews);
    }
    catch (error) {
        console.error('getFeaturedNews error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.getFeaturedNews = getFeaturedNews;
const getNewsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const { limit = 20, page = 1 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const news = await News_1.default.find({ category: category.toUpperCase() })
            .sort({ publishedDate: -1 })
            .limit(Number(limit))
            .skip(skip)
            .select('-content');
        const total = await News_1.default.countDocuments({ category: category.toUpperCase() });
        res.json({
            news,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('getNewsByCategory error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.getNewsByCategory = getNewsByCategory;
const searchNews = async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;
        if (!q) {
            return res.status(400).json({ message: 'Search query required' });
        }
        const searchResults = await News_1.default.find({
            $or: [
                { headline: { $regex: q, $options: 'i' } },
                { subHeadline: { $regex: q, $options: 'i' } },
                { summary: { $regex: q, $options: 'i' } },
                { tags: { $in: [new RegExp(q, 'i')] } }
            ]
        })
            .sort({ publishedDate: -1 })
            .limit(Number(limit))
            .select('newsId headline subHeadline summary publishedDate featuredImage');
        res.json(searchResults);
    }
    catch (error) {
        console.error('searchNews error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.searchNews = searchNews;
