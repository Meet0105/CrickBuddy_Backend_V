"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamById = exports.getAllTeams = void 0;
const Team_1 = __importDefault(require("../../models/Team"));
const axios_1 = __importDefault(require("axios"));
// Function to get all teams - first check database, then API if needed
const getAllTeams = async (req, res) => {
    var _a, _b, _c;
    try {
        // First, try to get teams from database
        const teamsFromDB = await Team_1.default.find({}).sort({ createdAt: -1 }).limit(100);
        // If we have teams in the database, return them with all fields including players
        if (teamsFromDB && teamsFromDB.length > 0) {
            const teamsWithPlayers = teamsFromDB.map(team => ({
                teamId: team.teamId,
                name: team.name,
                country: team.country,
                flagImage: team.flagImage,
                players: team.players || [],
                raw: team.raw,
                createdAt: team.createdAt,
                updatedAt: team.updatedAt
            }));
            return res.json(teamsWithPlayers);
        }
        // If no teams in database and no API key, return empty array
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_TEAMS_URL = process.env.RAPIDAPI_TEAMS_LIST_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_TEAMS_URL) {
            // If API key is missing, return empty array instead of trying to fetch from API
            return res.json([]);
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch teams from Cricbuzz API
        const response = await axios_1.default.get(RAPIDAPI_TEAMS_URL, { headers, timeout: 15000 });
        let teamsList = [];
        // Handle different response structures from RapidAPI
        if (Array.isArray(response.data)) {
            teamsList = response.data;
        }
        else if (Array.isArray(response.data.teams)) {
            teamsList = response.data.teams;
        }
        else {
            const values = Object.values(response.data || {});
            const arr = values.find((v) => Array.isArray(v) && v.length && typeof v[0] === 'object');
            if (arr)
                teamsList = arr;
        }
        if (!teamsList || !teamsList.length) {
            return res.status(500).json({
                message: 'No teams array found in RapidAPI response. Inspect provider response.',
                providerResponseSample: response.data
            });
        }
        const teams = teamsList.map((t) => {
            var _a;
            // Construct the flag image URL if imageId is available
            let flagImageUrl = '';
            if (t.imageId) {
                // Construct the proper image URL path
                flagImageUrl = `/api/photos/image/${t.imageId}`;
            }
            return {
                teamId: (_a = (t.id || t.teamId || t.tid || JSON.stringify(t).slice(0, 40))) === null || _a === void 0 ? void 0 : _a.toString(),
                name: t.name || t.teamName || t.fullName || 'Unknown Team',
                country: t.country || t.nationality || '',
                flagImage: {
                    url: flagImageUrl,
                    alt: `${t.name || t.teamName || 'Team'} flag`
                },
                players: [], // We'll populate this separately
                raw: t
            };
        });
        // Store teams in database for future offline use
        try {
            for (const team of teams) {
                await Team_1.default.findOneAndUpdate({ teamId: team.teamId }, {
                    ...team,
                    lastSync: new Date()
                }, { upsert: true, new: true });
            }
            console.log(`Stored ${teams.length} teams in database`);
        }
        catch (dbError) {
            console.error('Error storing teams in database:', dbError);
        }
        res.json(teams);
    }
    catch (error) {
        console.error('getAllTeams error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch teams', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.getAllTeams = getAllTeams;
// Function to get team by ID - first check database, then API if needed
const getTeamById = async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const { id } = req.params;
        // First, try to get team from database
        const teamFromDB = await Team_1.default.findOne({ teamId: id });
        // If we have the team in the database, return it
        if (teamFromDB) {
            return res.json(teamFromDB);
        }
        // If team not in database and no API key, return 404
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_TEAMS_URL = process.env.RAPIDAPI_TEAMS_LIST_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_TEAMS_URL) {
            // If API key is missing, return 404 instead of trying to fetch from API
            return res.status(404).json({ message: 'Team not found' });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch teams from Cricbuzz API
        const response = await axios_1.default.get(RAPIDAPI_TEAMS_URL, { headers, timeout: 15000 });
        let teamsList = [];
        // Handle different response structures from RapidAPI
        if (Array.isArray(response.data)) {
            teamsList = response.data;
        }
        else if (Array.isArray(response.data.teams)) {
            teamsList = response.data.teams;
        }
        else {
            const values = Object.values(response.data || {});
            const arr = values.find((v) => Array.isArray(v) && v.length && typeof v[0] === 'object');
            if (arr)
                teamsList = arr;
        }
        if (!teamsList || !teamsList.length) {
            return res.status(500).json({
                message: 'No teams array found in RapidAPI response. Inspect provider response.',
                providerResponseSample: response.data
            });
        }
        // Find the requested team
        const teamData = teamsList.find((t) => { var _a; return ((_a = (t.id || t.teamId || t.tid)) === null || _a === void 0 ? void 0 : _a.toString()) === id; });
        if (!teamData) {
            return res.status(404).json({ message: 'Team not found' });
        }
        // Construct the flag image URL if imageId is available
        let flagImageUrl = '';
        if (teamData.imageId) {
            // Construct the proper image URL path
            flagImageUrl = `/api/photos/image/${teamData.imageId}`;
        }
        const team = {
            teamId: (_a = (teamData.id || teamData.teamId || teamData.tid || JSON.stringify(teamData).slice(0, 40))) === null || _a === void 0 ? void 0 : _a.toString(),
            name: teamData.name || teamData.teamName || teamData.fullName || 'Unknown Team',
            country: teamData.country || teamData.nationality || '',
            flagImage: {
                url: flagImageUrl,
                alt: `${teamData.name || teamData.teamName || 'Team'} flag`
            },
            players: [], // We'll populate this separately
            raw: teamData
        };
        // Store team in database for future offline use
        try {
            await Team_1.default.findOneAndUpdate({ teamId: team.teamId }, {
                ...team,
                lastSync: new Date()
            }, { upsert: true, new: true });
            console.log(`Stored team ${team.name} in database`);
        }
        catch (dbError) {
            console.error('Error storing team in database:', dbError);
        }
        res.json(team);
    }
    catch (error) {
        console.error('getTeamById error:', ((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message || error);
        // Handle rate limiting
        if (((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch team', error: ((_d = error === null || error === void 0 ? void 0 : error.response) === null || _d === void 0 ? void 0 : _d.data) || error.message });
    }
};
exports.getTeamById = getTeamById;
