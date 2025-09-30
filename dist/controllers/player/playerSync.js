"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncPlayersFromRapidAPI = void 0;
const Player_1 = __importDefault(require("../../models/Player"));
const axios_1 = __importDefault(require("axios"));
// Function to sync players from RapidAPI
const syncPlayersFromRapidAPI = async (req, res) => {
    var _a, _b, _c;
    try {
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_PLAYERS_URL = process.env.RAPIDAPI_PLAYERS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_PLAYERS_URL) {
            return res.status(500).json({
                message: 'Missing environment variables for RapidAPI configuration'
            });
        }
        // Fetch players from RapidAPI
        const response = await axios_1.default.get(RAPIDAPI_PLAYERS_URL, {
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': RAPIDAPI_HOST
            }
        });
        const playersData = response.data;
        // Sync players to database
        let syncedCount = 0;
        // Handle the structure returned by the search endpoint
        // The response has a 'player' field which is an array of player objects
        if (playersData && playersData.player && Array.isArray(playersData.player)) {
            for (const playerData of playersData.player) {
                // Extract player ID
                const playerId = playerData.id || playerData.playerId;
                if (playerId) {
                    try {
                        // Update or create player in database
                        await Player_1.default.findOneAndUpdate({ playerId: playerId }, {
                            playerId: playerId,
                            name: playerData.name || playerData.fullName || '',
                            role: playerData.role || playerData.position || '',
                            country: playerData.teamName || playerData.country || playerData.nationality || '',
                            raw: playerData
                        }, { upsert: true, new: true });
                        syncedCount++;
                    }
                    catch (error) {
                        console.error(`Error syncing player ${playerId}:`, error);
                    }
                }
            }
        }
        res.json({
            message: `Synced ${syncedCount} players.`,
            count: syncedCount
        });
    }
    catch (error) {
        console.error('syncPlayersFromRapidAPI error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Players sync failed', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.syncPlayersFromRapidAPI = syncPlayersFromRapidAPI;
