"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchMatches = void 0;
const Match_1 = __importDefault(require("../../models/Match"));
const searchMatches = async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;
        if (!q) {
            return res.status(400).json({ message: 'Search query required' });
        }
        const searchResults = await Match_1.default.find({
            $or: [
                { title: { $regex: q, $options: 'i' } },
                { shortTitle: { $regex: q, $options: 'i' } },
                { 'teams.teamName': { $regex: q, $options: 'i' } },
                { 'series.name': { $regex: q, $options: 'i' } },
                { 'venue.name': { $regex: q, $options: 'i' } }
            ]
        })
            .sort({ startDate: -1 })
            .limit(Number(limit))
            .select('matchId title shortTitle teams venue series startDate status format');
        res.json(searchResults);
    }
    catch (error) {
        console.error('searchMatches error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.searchMatches = searchMatches;
