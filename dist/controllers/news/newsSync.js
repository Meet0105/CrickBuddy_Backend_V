"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncNewsFromRapidAPI = void 0;
const News_1 = __importDefault(require("../../models/News"));
const axios_1 = __importDefault(require("axios"));
// New function to sync news from RapidAPI using the proper endpoint
const syncNewsFromRapidAPI = async (req, res) => {
    var _a, _b, _c;
    try {
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_NEWS_LIST_URL = process.env.RAPIDAPI_NEWS_LIST_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_NEWS_LIST_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_NEWS_LIST_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch news from Cricbuzz API
        const response = await axios_1.default.get(RAPIDAPI_NEWS_LIST_URL, { headers, timeout: 15000 });
        let newsList = [];
        console.log('News API Response structure:', Object.keys(response.data));
        // Handle the specific response structure from Cricbuzz news API
        if (response.data && response.data.storyList) {
            console.log('Found storyList with', response.data.storyList.length, 'items');
            // Extract news items from storyList
            for (const storyItem of response.data.storyList) {
                if (storyItem.story) {
                    newsList.push(storyItem.story);
                }
                else if (storyItem) {
                    // Sometimes the story data is directly in the storyItem
                    newsList.push(storyItem);
                }
            }
        }
        else if (Array.isArray(response.data)) {
            newsList = response.data;
        }
        else if (response.data.news) {
            newsList = response.data.news;
        }
        else {
            // Try to find any array in the response
            const values = Object.values(response.data || {});
            const arr = values.find((v) => Array.isArray(v) && v.length && typeof v[0] === 'object');
            if (arr) {
                console.log('Found array with', arr.length, 'items');
                newsList = arr;
            }
        }
        console.log('Processed news list length:', newsList.length);
        if (!newsList || !newsList.length) {
            return res.status(500).json({
                message: 'No news array found in RapidAPI response. Inspect provider response.',
                providerResponseSample: response.data
            });
        }
        const upsertPromises = newsList.map(async (n) => {
            var _a, _b, _c, _d, _e, _f;
            const newsId = n.id || n.storyId || n.newsId || ((_a = n.story) === null || _a === void 0 ? void 0 : _a.id) || JSON.stringify(n).slice(0, 40);
            // Handle nested story object if present
            const storyData = n.story || n;
            // Parse published date
            let publishedDate = new Date();
            if (storyData.pubTime) {
                publishedDate = new Date(parseInt(storyData.pubTime));
            }
            else if (storyData.publishedAt || storyData.date || storyData.publishedDate) {
                publishedDate = new Date(storyData.publishedAt || storyData.date || storyData.publishedDate);
            }
            const doc = {
                newsId: newsId === null || newsId === void 0 ? void 0 : newsId.toString(),
                headline: storyData.hline || storyData.title || storyData.headline || storyData.name || 'Untitled News',
                subHeadline: storyData.intro || storyData.subtitle || storyData.subHeadline || storyData.description || '',
                content: storyData.content || storyData.story || storyData.description || storyData.intro || 'Content not available',
                summary: storyData.summary || storyData.intro || storyData.excerpt || storyData.description || '',
                author: {
                    name: ((_b = storyData.author) === null || _b === void 0 ? void 0 : _b.name) || storyData.author || storyData.publisher || 'Cricket News',
                    image: ((_c = storyData.author) === null || _c === void 0 ? void 0 : _c.image) || storyData.authorImage || ''
                },
                publishedDate: publishedDate,
                lastModified: storyData.lastModified || storyData.updatedAt || new Date(),
                category: storyData.category || storyData.type || 'CRICKET',
                tags: Array.isArray(storyData.tags) ? storyData.tags : [],
                relatedMatches: Array.isArray(storyData.matchId) ? storyData.matchId : (storyData.matchId ? [storyData.matchId] : []),
                relatedPlayers: Array.isArray(storyData.playerId) ? storyData.playerId : (storyData.playerId ? [storyData.playerId] : []),
                relatedTeams: Array.isArray(storyData.teamId) ? storyData.teamId : (storyData.teamId ? [storyData.teamId] : []),
                featuredImage: {
                    url: storyData.imageId || storyData.imageURL || ((_d = storyData.featuredImage) === null || _d === void 0 ? void 0 : _d.url) || storyData.imageUrl || '',
                    caption: storyData.imageCaption || ((_e = storyData.featuredImage) === null || _e === void 0 ? void 0 : _e.caption) || '',
                    credit: storyData.imageCredit || ((_f = storyData.featuredImage) === null || _f === void 0 ? void 0 : _f.credit) || ''
                },
                isBreaking: storyData.isBreaking || storyData.breaking || false,
                isFeatured: storyData.isFeatured || storyData.featured || false,
                priority: storyData.priority || storyData.sortOrder || 0,
                readTime: storyData.readTime || storyData.estimatedReadingTime || 3,
                views: 0,
                likes: storyData.likes || 0,
                comments: storyData.comments || 0,
                seoMeta: {
                    metaTitle: storyData.seoTitle || storyData.metaTitle || storyData.title || storyData.hline || '',
                    metaDescription: storyData.seoDescription || storyData.metaDescription || storyData.description || storyData.intro || '',
                    keywords: Array.isArray(storyData.keywords) ? storyData.keywords : []
                },
                raw: n
            };
            Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);
            return News_1.default.findOneAndUpdate({ newsId: doc.newsId }, { $set: doc }, { upsert: true, new: true, setDefaultsOnInsert: true });
        });
        const results = await Promise.all(upsertPromises);
        res.json({ message: `Synced ${results.length} news items.`, count: results.length });
    }
    catch (error) {
        console.error('syncNewsFromRapidAPI error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'News sync failed', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.syncNewsFromRapidAPI = syncNewsFromRapidAPI;
