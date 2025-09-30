"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNewsCategories = exports.getNewsByCategoryId = void 0;
const News_1 = __importDefault(require("../../models/News"));
const axios_1 = __importDefault(require("axios"));
// New function to get news by category ID using the proper endpoint
const getNewsByCategoryId = async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const { categoryId } = req.params;
        const { limit = '20', page = '1' } = req.query;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_NEWS_CATEGORY_LIST_URL = process.env.RAPIDAPI_NEWS_CATEGORY_LIST_URL;
        // If API keys are missing, serve from database
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_NEWS_CATEGORY_LIST_URL) {
            console.log('RapidAPI config missing, serving news from database');
            const skip = (Number(page) - 1) * Number(limit);
            const news = await News_1.default.find({ category: categoryId })
                .sort({ publishedDate: -1 })
                .limit(Number(limit))
                .skip(skip)
                .select('-content');
            const total = await News_1.default.countDocuments({ category: categoryId });
            return res.json({
                news,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch news by category from Cricbuzz API
        const url = `${RAPIDAPI_NEWS_CATEGORY_LIST_URL}/${categoryId}`;
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        let newsList = [];
        // Handle the specific response structure from Cricbuzz news API
        if (response.data && response.data.storyList) {
            // Extract news items from storyList
            for (const storyItem of response.data.storyList) {
                if (storyItem.story) {
                    newsList.push(storyItem.story);
                }
            }
        }
        else if (Array.isArray(response.data)) {
            newsList = response.data;
        }
        else {
            const values = Object.values(response.data || {});
            const arr = values.find((v) => Array.isArray(v) && v.length && typeof v[0] === 'object');
            if (arr)
                newsList = arr;
        }
        if (!newsList || !newsList.length) {
            return res.status(500).json({
                message: 'No news array found in RapidAPI response. Inspect provider response.',
                providerResponseSample: response.data
            });
        }
        // Save to database
        const upsertPromises = newsList.map(async (n) => {
            var _a, _b, _c, _d, _e;
            const newsId = n.id || n.storyId || n.newsId || JSON.stringify(n).slice(0, 40);
            const doc = {
                newsId: newsId === null || newsId === void 0 ? void 0 : newsId.toString(),
                headline: n.hline || n.title || n.headline || n.name || 'Untitled News',
                subHeadline: n.intro || n.subtitle || n.subHeadline || n.description || '',
                content: n.content || n.story || n.description || '',
                summary: n.summary || n.intro || n.excerpt || n.description || '',
                author: {
                    name: ((_a = n.author) === null || _a === void 0 ? void 0 : _a.name) || n.author || n.publisher || 'Unknown Author',
                    image: ((_b = n.author) === null || _b === void 0 ? void 0 : _b.image) || n.authorImage || ''
                },
                publishedDate: n.pubTime || n.publishedAt || n.date || n.publishedDate || new Date(),
                lastModified: n.lastModified || n.updatedAt || new Date(),
                category: n.category || n.type || 'OTHER',
                tags: Array.isArray(n.tags) ? n.tags : [],
                relatedMatches: Array.isArray(n.matchId) ? n.matchId : (n.matchId ? [n.matchId] : []),
                relatedPlayers: Array.isArray(n.playerId) ? n.playerId : (n.playerId ? [n.playerId] : []),
                relatedTeams: Array.isArray(n.teamId) ? n.teamId : (n.teamId ? [n.teamId] : []),
                featuredImage: {
                    url: n.imageId || n.imageURL || ((_c = n.featuredImage) === null || _c === void 0 ? void 0 : _c.url) || n.imageUrl || '',
                    caption: n.imageCaption || ((_d = n.featuredImage) === null || _d === void 0 ? void 0 : _d.caption) || '',
                    credit: n.imageCredit || ((_e = n.featuredImage) === null || _e === void 0 ? void 0 : _e.credit) || ''
                },
                isBreaking: n.isBreaking || n.breaking || false,
                isFeatured: n.isFeatured || n.featured || false,
                priority: n.priority || n.sortOrder || 0,
                readTime: n.readTime || n.estimatedReadingTime || 5,
                views: 0,
                likes: n.likes || 0,
                comments: n.comments || 0,
                seoMeta: {
                    metaTitle: n.seoTitle || n.metaTitle || n.title || '',
                    metaDescription: n.seoDescription || n.metaDescription || n.description || '',
                    keywords: Array.isArray(n.keywords) ? n.keywords : []
                },
                raw: n
            };
            Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);
            return News_1.default.findOneAndUpdate({ newsId: doc.newsId }, { $set: doc }, { upsert: true, new: true, setDefaultsOnInsert: true });
        });
        await Promise.all(upsertPromises);
        // Return from database
        const skip = (Number(page) - 1) * Number(limit);
        const news = await News_1.default.find({ category: categoryId })
            .sort({ publishedDate: -1 })
            .limit(Number(limit))
            .skip(skip)
            .select('-content');
        const total = await News_1.default.countDocuments({ category: categoryId });
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
        console.error('getNewsByCategoryId error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle different types of errors
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            // Fallback to database if API rate limit exceeded
            try {
                const { limit = '20', page = '1' } = req.query;
                const skip = (Number(page) - 1) * Number(limit);
                const news = await News_1.default.find({ category: req.params.categoryId })
                    .sort({ publishedDate: -1 })
                    .limit(Number(limit))
                    .skip(skip)
                    .select('-content');
                const total = await News_1.default.countDocuments({ category: req.params.categoryId });
                return res.json({
                    news,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        pages: Math.ceil(total / Number(limit))
                    }
                });
            }
            catch (dbError) {
                return res.status(500).json({ message: 'Server error', error: dbError.message });
            }
        }
        // Handle subscription/authorization errors
        if (((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.status) === 403) {
            return res.status(403).json({
                message: 'API subscription error. Please check your RapidAPI subscription to Cricbuzz Cricket API.',
                error: 'Forbidden - Not subscribed to API'
            });
        }
        res.status(500).json({ message: 'Failed to fetch news by category', error: ((_d = error === null || error === void 0 ? void 0 : error.response) === null || _d === void 0 ? void 0 : _d.data) || error.message });
    }
};
exports.getNewsByCategoryId = getNewsByCategoryId;
// New function to get news categories
const getNewsCategories = async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_NEWS_CATEGORIES_URL = process.env.RAPIDAPI_NEWS_CATEGORIES_URL;
        // If API keys are missing, return static categories from database
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_NEWS_CATEGORIES_URL) {
            console.log('RapidAPI config missing, returning static news categories');
            // Get unique categories from existing news in database
            const categories = await News_1.default.distinct('category');
            // Return static categories with some common ones if database is empty
            const staticCategories = categories.length > 0 ? categories : [
                'CRICKET',
                'INTERNATIONAL',
                'DOMESTIC',
                'IPL',
                'T20',
                'ODI',
                'TEST',
                'WOMEN',
                'OTHER'
            ];
            return res.json(staticCategories.map(cat => ({
                id: cat,
                name: cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase(),
                displayName: cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
            })));
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch news categories from Cricbuzz API
        const response = await axios_1.default.get(RAPIDAPI_NEWS_CATEGORIES_URL, { headers, timeout: 15000 });
        // Extract categories from the response
        let categories = [];
        if (response.data && response.data.storyType) {
            categories = response.data.storyType.map((cat) => {
                var _a;
                return ({
                    id: ((_a = cat.id) === null || _a === void 0 ? void 0 : _a.toString()) || cat.name,
                    name: cat.name,
                    description: cat.description,
                    displayName: cat.name
                });
            });
        }
        res.json(categories);
    }
    catch (error) {
        console.error('getNewsCategories error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle different types of errors
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        // Handle subscription/authorization errors
        if (((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.status) === 403) {
            return res.status(403).json({
                message: 'API subscription error. Please check your RapidAPI subscription to Cricbuzz Cricket API.',
                error: 'Forbidden - Not subscribed to API'
            });
        }
        res.status(500).json({ message: 'Failed to fetch news categories', error: ((_d = error === null || error === void 0 ? void 0 : error.response) === null || _d === void 0 ? void 0 : _d.data) || error.message });
    }
};
exports.getNewsCategories = getNewsCategories;
