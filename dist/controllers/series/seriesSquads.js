"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSeriesPlayers = exports.getSeriesSquadsWithPlayers = exports.refreshSeriesSquads = exports.clearSeriesSquads = exports.getSeriesSquads = exports.testSeriesSquadsAPI = void 0;
const Series_1 = __importDefault(require("../../models/Series"));
const axios_1 = __importDefault(require("axios"));
// Enhanced function to get series squads with database storage
// Test function to debug API response
const testSeriesSquadsAPI = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_SERIES_SQUADS_URL = process.env.RAPIDAPI_SERIES_SQUADS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_SQUADS_URL) {
            return res.status(500).json({ message: 'API config missing' });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        const baseUrl = RAPIDAPI_SERIES_SQUADS_URL.replace(/\/\d+\/squads$/, '');
        const url = `${baseUrl}/${id}/squads`;
        console.log('🧪 TESTING API CALL:', url);
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        // Return raw API response for inspection
        res.json({
            url: url,
            status: response.status,
            headers: response.headers,
            data: response.data
        });
    }
    catch (error) {
        console.error('Test API error:', error);
        res.status(500).json({
            message: 'Test API failed',
            error: error.message,
            response: (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data
        });
    }
};
exports.testSeriesSquadsAPI = testSeriesSquadsAPI;
const getSeriesSquads = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        // First, try to get squads from database
        const seriesFromDB = await Series_1.default.findOne({ seriesId: id });
        if (seriesFromDB && seriesFromDB.squads && seriesFromDB.squads.length > 0) {
            console.log('Returning squads from database');
            return res.json({
                squads: seriesFromDB.squads,
                seriesName: seriesFromDB.name,
                lastUpdated: seriesFromDB.updatedAt
            });
        }
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_SERIES_SQUADS_URL = process.env.RAPIDAPI_SERIES_SQUADS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_SQUADS_URL) {
            console.log('⚠️ RapidAPI config missing - cannot fetch real squad data');
            return res.status(500).json({
                message: 'API configuration missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_SERIES_SQUADS_URL in .env',
                squads: [],
                seriesName: (seriesFromDB === null || seriesFromDB === void 0 ? void 0 : seriesFromDB.name) || 'Series',
                lastUpdated: (seriesFromDB === null || seriesFromDB === void 0 ? void 0 : seriesFromDB.updatedAt) || new Date()
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Replace the hardcoded series ID in the URL with the requested series ID
        const baseUrl = RAPIDAPI_SERIES_SQUADS_URL.replace(/\/\d+\/squads$/, '');
        const url = `${baseUrl}/${id}/squads`;
        console.log('🌐 API URL Construction:');
        console.log('  Original URL:', RAPIDAPI_SERIES_SQUADS_URL);
        console.log('  Base URL:', baseUrl);
        console.log('  Series ID:', id);
        console.log('  Final URL:', url);
        console.log('Fetching squads from API:', url);
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        // Debug: Log the actual API response structure
        console.log('🔍 SQUADS API RESPONSE STRUCTURE:', JSON.stringify(response.data, null, 2));
        // Validate that we received actual data from the API
        if (!response.data || (typeof response.data === 'object' && Object.keys(response.data).length === 0)) {
            console.log('⚠️ API returned empty or invalid response');
            return res.json({
                squads: [],
                seriesName: (seriesFromDB === null || seriesFromDB === void 0 ? void 0 : seriesFromDB.name) || 'Series',
                lastUpdated: new Date(),
                message: 'No squad data available from API'
            });
        }
        // Process and store squads data with enhanced extraction
        let squads = [];
        // Handle the actual API response structure
        let squadData = null;
        if (response.data && response.data.squads) {
            squadData = response.data.squads;
        }
        if (squadData && Array.isArray(squadData)) {
            console.log(`📋 Found ${squadData.length} squad entries`);
            // Filter out header entries and process actual squads
            const actualSquads = squadData.filter((squad) => !squad.isHeader && squad.squadId && squad.squadType);
            console.log(`🏏 Processing ${actualSquads.length} actual squads`);
            // For now, create squad entries with team info (players will need separate API calls)
            squads = actualSquads.map((squad) => {
                var _a, _b;
                const teamName = squad.squadType || 'Unknown Team';
                console.log(`📝 Creating squad entry for: ${teamName} (ID: ${squad.squadId})`);
                return {
                    teamId: ((_a = squad.teamId) === null || _a === void 0 ? void 0 : _a.toString()) || ((_b = squad.squadId) === null || _b === void 0 ? void 0 : _b.toString()),
                    teamName: teamName.trim(),
                    players: [], // Players will be fetched separately if needed
                    lastUpdated: new Date()
                };
            });
            console.log(`✅ Created ${squads.length} squad entries`);
        }
        else {
            console.log('⚠️ No squad data found in API response');
        }
        console.log(`Processed ${squads.length} squads with player counts:`, squads.map(s => `${s.teamName}: ${s.players.length} players`));
        // Store squads data in database
        if (squads.length > 0 && seriesFromDB) {
            console.log('Storing squads data in database');
            seriesFromDB.squads = squads;
            await seriesFromDB.save();
        }
        res.json({
            squads,
            seriesName: (seriesFromDB === null || seriesFromDB === void 0 ? void 0 : seriesFromDB.name) || 'Series',
            lastUpdated: new Date()
        });
    }
    catch (error) {
        console.error('getSeriesSquads error:', error);
        // Handle rate limiting
        if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch series squads', error: error.message });
    }
};
exports.getSeriesSquads = getSeriesSquads;
// Function to clear fake/demo squad data from database
const clearSeriesSquads = async (req, res) => {
    try {
        const { id } = req.params;
        const seriesFromDB = await Series_1.default.findOne({ seriesId: id });
        if (!seriesFromDB) {
            return res.status(404).json({ message: 'Series not found' });
        }
        // Clear existing squad data
        seriesFromDB.squads = [];
        await seriesFromDB.save();
        console.log(`✅ Cleared squad data for series ${id}`);
        res.json({
            message: 'Squad data cleared successfully',
            seriesId: id,
            seriesName: seriesFromDB.name
        });
    }
    catch (error) {
        console.error('clearSeriesSquads error:', error);
        res.status(500).json({ message: 'Failed to clear series squads', error: error.message });
    }
};
exports.clearSeriesSquads = clearSeriesSquads;
// Helper function to fetch players for a specific squad
const fetchSquadPlayers = async (seriesId, squadId, headers) => {
    var _a, _b, _c;
    try {
        const RAPIDAPI_SERIES_SQUADS_URL = process.env.RAPIDAPI_SERIES_SQUADS_URL;
        const baseUrl = RAPIDAPI_SERIES_SQUADS_URL.replace(/\/\d+\/squads$/, '');
        const url = `${baseUrl}/${seriesId}/squads/${squadId}`;
        console.log(`  🔍 Fetching players from: ${url}`);
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        const players = [];
        const playerData = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.player) || [];
        if (Array.isArray(playerData)) {
            const actualPlayers = playerData.filter((player) => !player.isHeader && player.name && player.id);
            console.log(`    👥 Found ${actualPlayers.length} players`);
            for (const player of actualPlayers) {
                const playerName = (_b = player.name) === null || _b === void 0 ? void 0 : _b.trim();
                if (playerName) {
                    players.push({
                        playerId: ((_c = player.id) === null || _c === void 0 ? void 0 : _c.toString()) || `player_${players.length}`,
                        playerName: playerName,
                        role: player.role || 'All-rounder',
                        battingStyle: player.battingStyle || '',
                        bowlingStyle: player.bowlingStyle || '',
                        isPlaying11: false, // This info might not be available in squad data
                        isCaptain: Boolean(player.captain),
                        isWicketKeeper: Boolean(player.keeper)
                    });
                }
            }
        }
        return players;
    }
    catch (error) {
        console.error(`    ❌ Failed to fetch players for squad ${squadId}:`, error.message);
        return [];
    }
};
// Function to force refresh squad data from API (bypassing database cache)
const refreshSeriesSquads = async (req, res) => {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const seriesFromDB = await Series_1.default.findOne({ seriesId: id });
        if (!seriesFromDB) {
            return res.status(404).json({ message: 'Series not found' });
        }
        // Clear existing squad data first
        seriesFromDB.squads = [];
        await seriesFromDB.save();
        console.log(`🗑️ Cleared existing squad data for series ${id}`);
        // Now fetch fresh data from API
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_SERIES_SQUADS_URL = process.env.RAPIDAPI_SERIES_SQUADS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_SQUADS_URL) {
            return res.status(500).json({
                message: 'API configuration missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_SERIES_SQUADS_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        const baseUrl = RAPIDAPI_SERIES_SQUADS_URL.replace(/\/\d+\/squads$/, '');
        const url = `${baseUrl}/${id}/squads`;
        console.log('🔄 Fetching fresh squad data from API:', url);
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        // Process the API response (same logic as getSeriesSquads)
        let squads = [];
        let squadData = null;
        if (response.data && response.data.squads) {
            squadData = response.data.squads;
        }
        else if (response.data && Array.isArray(response.data)) {
            squadData = response.data;
        }
        else if (response.data && response.data.squad) {
            squadData = response.data.squad;
        }
        else if (response.data) {
            const keys = Object.keys(response.data);
            for (const key of keys) {
                if (Array.isArray(response.data[key]) && response.data[key].length > 0) {
                    squadData = response.data[key];
                    break;
                }
            }
        }
        if (squadData && Array.isArray(squadData)) {
            console.log(`📋 Found ${squadData.length} squad entries`);
            // Filter out header entries and process actual squads
            const actualSquads = squadData.filter((squad) => !squad.isHeader && squad.squadId && squad.squadType);
            console.log(`🏏 Processing ${actualSquads.length} actual squads`);
            // Fetch player data for each squad
            squads = [];
            for (const squad of actualSquads) {
                const teamName = squad.squadType || 'Unknown Team';
                const squadId = (_a = squad.squadId) === null || _a === void 0 ? void 0 : _a.toString();
                console.log(`📝 Processing squad: ${teamName} (ID: ${squadId})`);
                // Fetch players for this squad
                const players = await fetchSquadPlayers(id, squadId, headers);
                squads.push({
                    teamId: ((_b = squad.teamId) === null || _b === void 0 ? void 0 : _b.toString()) || squadId,
                    teamName: teamName.trim(),
                    players: players,
                    lastUpdated: new Date()
                });
                console.log(`  ✅ Added ${players.length} players for ${teamName}`);
                // Add a small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            console.log(`✅ Created ${squads.length} squad entries with players`);
        }
        else {
            console.log('⚠️ No squad data found in API response');
        }
        // Store fresh data in database
        if (squads.length > 0) {
            seriesFromDB.squads = squads;
            await seriesFromDB.save();
            console.log(`✅ Stored ${squads.length} fresh squads in database`);
        }
        res.json({
            message: 'Squad data refreshed successfully',
            squads,
            seriesName: seriesFromDB.name,
            lastUpdated: new Date()
        });
    }
    catch (error) {
        console.error('refreshSeriesSquads error:', error);
        if (((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to refresh series squads', error: error.message });
    }
};
exports.refreshSeriesSquads = refreshSeriesSquads;
// Function to get series squads with full player data
const getSeriesSquadsWithPlayers = async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_SERIES_SQUADS_URL = process.env.RAPIDAPI_SERIES_SQUADS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_SQUADS_URL) {
            return res.status(500).json({
                message: 'API configuration missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_SERIES_SQUADS_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        const baseUrl = RAPIDAPI_SERIES_SQUADS_URL.replace(/\/\d+\/squads$/, '');
        const url = `${baseUrl}/${id}/squads`;
        console.log('🔄 Fetching squads with players from API:', url);
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        let squads = [];
        let squadData = null;
        if (response.data && response.data.squads) {
            squadData = response.data.squads;
        }
        if (squadData && Array.isArray(squadData)) {
            console.log(`📋 Found ${squadData.length} squad entries`);
            const actualSquads = squadData.filter((squad) => !squad.isHeader && squad.squadId && squad.squadType);
            console.log(`🏏 Processing ${actualSquads.length} actual squads with players`);
            // Fetch player data for each squad
            for (const squad of actualSquads) {
                const teamName = squad.squadType || 'Unknown Team';
                const squadId = (_a = squad.squadId) === null || _a === void 0 ? void 0 : _a.toString();
                console.log(`📝 Processing squad: ${teamName} (ID: ${squadId})`);
                // Fetch players for this squad
                const players = await fetchSquadPlayers(id, squadId, headers);
                squads.push({
                    teamId: ((_b = squad.teamId) === null || _b === void 0 ? void 0 : _b.toString()) || squadId,
                    teamName: teamName.trim(),
                    players: players,
                    lastUpdated: new Date()
                });
                console.log(`  ✅ Added ${players.length} players for ${teamName}`);
                // Add a small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            console.log(`✅ Fetched ${squads.length} squads with full player data`);
        }
        // Get series info
        const seriesFromDB = await Series_1.default.findOne({ seriesId: id });
        res.json({
            squads,
            seriesName: (seriesFromDB === null || seriesFromDB === void 0 ? void 0 : seriesFromDB.name) || ((_c = response.data) === null || _c === void 0 ? void 0 : _c.seriesName) || 'Series',
            lastUpdated: new Date()
        });
    }
    catch (error) {
        console.error('getSeriesSquadsWithPlayers error:', error);
        if (((_d = error === null || error === void 0 ? void 0 : error.response) === null || _d === void 0 ? void 0 : _d.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch series squads with players', error: error.message });
    }
};
exports.getSeriesSquadsWithPlayers = getSeriesSquadsWithPlayers;
// New function to get series players
const getSeriesPlayers = async (req, res) => {
    var _a;
    try {
        const { id, squadId } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_SERIES_SQUADS_URL = process.env.RAPIDAPI_SERIES_SQUADS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_SQUADS_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_SERIES_SQUADS_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Replace the hardcoded series ID in the URL with the requested series ID
        // Example: if RAPIDAPI_SERIES_SQUADS_URL is "https://cricbuzz-cricket.p.rapidapi.com/series/v1/3718/squads"
        // and id is "1234", we want "https://cricbuzz-cricket.p.rapidapi.com/series/v1/1234/squads/{squadId}"
        const baseUrl = RAPIDAPI_SERIES_SQUADS_URL.replace(/\/\d+\/squads$/, '');
        const url = `${baseUrl}/${id}/squads/${squadId}`;
        // Try to fetch series players from Cricbuzz API
        const response = await axios_1.default.get(url, { headers, timeout: 15000 });
        res.json(response.data);
    }
    catch (error) {
        console.error('getSeriesPlayers error:', error);
        // Handle rate limiting
        if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to fetch series players', error: error.message });
    }
};
exports.getSeriesPlayers = getSeriesPlayers;
