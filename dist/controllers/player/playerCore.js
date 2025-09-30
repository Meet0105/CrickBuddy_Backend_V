"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlayerById = exports.getAllPlayers = void 0;
const Player_1 = __importDefault(require("../../models/Player"));
// Function to get all players - first check database, then API if needed
const getAllPlayers = async (req, res) => {
    var _a, _b;
    try {
        // First, try to get players from database
        const playersFromDB = await Player_1.default.find({}).sort({ createdAt: -1 }).limit(100);
        // If we have players in the database, return them
        if (playersFromDB && playersFromDB.length > 0) {
            return res.json(playersFromDB);
        }
        // If no players in database, we would normally fetch from API
        // But for now, let's return empty array since we don't want to overload the API
        res.json([]);
    }
    catch (error) {
        console.error('getAllPlayers error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        res.status(500).json({ message: 'Failed to fetch players', error: ((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message });
    }
};
exports.getAllPlayers = getAllPlayers;
// Function to get player by ID - first check database, then API if needed
const getPlayerById = async (req, res) => {
    var _a, _b;
    try {
        const { id } = req.params;
        // First, try to get player from database
        const playerFromDB = await Player_1.default.findOne({ playerId: id });
        // If we have the player in the database, return it
        if (playerFromDB) {
            return res.json(playerFromDB);
        }
        // If player not in database, return 404
        res.status(404).json({ message: 'Player not found' });
    }
    catch (error) {
        console.error('getPlayerById error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        res.status(500).json({ message: 'Failed to fetch player', error: ((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message });
    }
};
exports.getPlayerById = getPlayerById;
