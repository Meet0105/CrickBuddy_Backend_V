"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamPlayers = exports.getTeamNews = void 0;
const axios_1 = __importDefault(require("axios"));
// Function to get team news
const getTeamNews = async (req, res) => {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_TEAMS_NEWS_URL = process.env.RAPIDAPI_TEAMS_NEWS_URL;
        // If API keys are missing, serve from database
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_TEAMS_NEWS_URL) {
            console.log('RapidAPI config missing, serving team news from database');
            // Import News model
            const News = require('../../models/News').default;
            // Find news related to this team
            const news = await News.find({
                $or: [
                    { relatedTeams: id },
                    { relatedTeams: { $in: [id] } }
                ]
            })
                .sort({ publishedDate: -1 })
                .limit(20)
                .select('-content');
            return res.json({
                storyList: news.map((n) => {
                    var _a, _b;
                    return ({
                        story: {
                            id: n.newsId,
                            hline: n.headline,
                            intro: n.subHeadline,
                            pubTime: n.publishedDate,
                            imageId: ((_a = n.featuredImage) === null || _a === void 0 ? void 0 : _a.url) || '',
                            source: ((_b = n.author) === null || _b === void 0 ? void 0 : _b.name) || 'CrickBuddy'
                        }
                    });
                })
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Build the URL directly using the working format
        const url = `https://${RAPIDAPI_HOST}/news/v1/team/${id}`;
        console.log(`Fetching team news for team ID ${id} from URL: ${url}`);
        // Try to fetch team news from Cricbuzz API
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getTeamNews error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch team news', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.getTeamNews = getTeamNews;
// Function to get team players
const getTeamPlayers = async (req, res) => {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_TEAMS_PLAYERS_URL = process.env.RAPIDAPI_TEAMS_PLAYERS_URL;
        // If API keys are missing, serve from database
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_TEAMS_PLAYERS_URL) {
            console.log('RapidAPI config missing, serving team players from database');
            // Import Team model
            const Team = require('../../models/Team').default;
            // Find team and populate players
            const team = await Team.findOne({ teamId: id });
            if (!team) {
                return res.status(404).json({ message: 'Team not found' });
            }
            // Return team players in expected format
            return res.json({
                player: team.players || [],
                teamName: team.name,
                teamId: team.teamId
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Build the URL directly using the working format
        const url = `https://${RAPIDAPI_HOST}/teams/v1/${id}/players`;
        console.log(`Fetching team players for team ID ${id} from URL: ${url}`);
        // Try to fetch team players from Cricbuzz API
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        // Store players data in database for future offline use
        try {
            const Team = require('../../models/Team').default;
            if (response.data && response.data.player) {
                await Team.findOneAndUpdate({ teamId: id }, {
                    players: response.data.player,
                    lastPlayersSync: new Date()
                }, { upsert: false });
                console.log(`Stored ${response.data.player.length} players for team ${id} in database`);
            }
        }
        catch (dbError) {
            console.error('Error storing team players in database:', dbError);
        }
        res.json(response.data);
    }
    catch (error) {
        console.error('getTeamPlayers error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch team players', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.getTeamPlayers = getTeamPlayers;
