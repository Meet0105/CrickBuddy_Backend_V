"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncSeriesFromRapidAPI = exports.updateSeriesData = void 0;
const Series_1 = __importDefault(require("../../models/Series"));
// Function to update a specific series with fresh data
const updateSeriesData = async (req, res) => {
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_SERIES_MATCHES_URL = process.env.RAPIDAPI_SERIES_MATCHES_URL;
        const RAPIDAPI_SERIES_POINTS_TABLE_URL = process.env.RAPIDAPI_SERIES_POINTS_TABLE_URL;
        const RAPIDAPI_SERIES_SQUADS_URL = process.env.RAPIDAPI_SERIES_SQUADS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
            return res.status(500).json({
                message: 'RapidAPI config is missing'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        const seriesFromDB = await Series_1.default.findOne({ seriesId: id });
        if (!seriesFromDB) {
            return res.status(404).json({ message: 'Series not found' });
        }
        let updatedData = {};
        // Update schedule/matches
        if (RAPIDAPI_SERIES_MATCHES_URL) {
            try {
                const matchesUrl = RAPIDAPI_SERIES_MATCHES_URL.replace('3641', id);
                const { rapidApiRateLimiter } = await Promise.resolve().then(() => __importStar(require('../../utils/rateLimiter')));
                const matchesResponse = await rapidApiRateLimiter.makeRequest(matchesUrl, { headers });
                let schedule = [];
                if (matchesResponse && matchesResponse.matchDetails) {
                    matchesResponse.matchDetails.forEach((matchDetail) => {
                        if (matchDetail.matchDetailsMap && matchDetail.matchDetailsMap.match) {
                            matchDetail.matchDetailsMap.match.forEach((match) => {
                                var _a, _b, _c, _d, _e, _f;
                                if (match.matchInfo) {
                                    const matchInfo = match.matchInfo;
                                    const rawStatus = matchInfo.state || matchInfo.status || 'UPCOMING';
                                    const matchId = (_a = matchInfo.matchId) === null || _a === void 0 ? void 0 : _a.toString();
                                    if (matchId) {
                                        schedule.push({
                                            matchId,
                                            matchDesc: matchInfo.matchDesc || matchInfo.matchFormat || 'Match',
                                            team1: ((_b = matchInfo.team1) === null || _b === void 0 ? void 0 : _b.teamName) || ((_c = matchInfo.team1) === null || _c === void 0 ? void 0 : _c.teamSName) || 'Team 1',
                                            team2: ((_d = matchInfo.team2) === null || _d === void 0 ? void 0 : _d.teamName) || ((_e = matchInfo.team2) === null || _e === void 0 ? void 0 : _e.teamSName) || 'Team 2',
                                            startDate: matchInfo.startDate ? new Date(parseInt(matchInfo.startDate)) : new Date(),
                                            venue: ((_f = matchInfo.venueInfo) === null || _f === void 0 ? void 0 : _f.ground) || matchInfo.venue || 'TBA',
                                            status: mapStatusToEnum(rawStatus),
                                            rawStatus: rawStatus,
                                            format: matchInfo.matchFormat || 'T20',
                                            result: matchInfo.result || null
                                        });
                                    }
                                }
                            });
                        }
                    });
                }
                if (schedule.length > 0) {
                    updatedData.schedule = schedule;
                    updatedData.totalMatches = schedule.length;
                    updatedData.completedMatches = schedule.filter(m => m.status === 'COMPLETED').length;
                }
            }
            catch (error) {
                console.error('Error updating schedule:', error);
            }
        }
        // Update points table
        if (RAPIDAPI_SERIES_POINTS_TABLE_URL) {
            try {
                const pointsUrl = RAPIDAPI_SERIES_POINTS_TABLE_URL.replace('3718', id);
                const { rapidApiRateLimiter } = await Promise.resolve().then(() => __importStar(require('../../utils/rateLimiter')));
                const pointsResponse = await rapidApiRateLimiter.makeRequest(pointsUrl, { headers });
                let pointsTable = [];
                if (pointsResponse) {
                    // Try multiple possible response structures
                    let tableData = null;
                    if (pointsResponse.pointsTable) {
                        if (Array.isArray(pointsResponse.pointsTable)) {
                            tableData = pointsResponse.pointsTable[0];
                        }
                        else {
                            tableData = pointsResponse.pointsTable;
                        }
                    }
                    else if (pointsResponse.table) {
                        tableData = pointsResponse.table;
                    }
                    else if (pointsResponse.standings) {
                        tableData = pointsResponse.standings;
                    }
                    if (tableData) {
                        let teamData = tableData.pointsTableInfo || tableData.teams || tableData;
                        if (Array.isArray(teamData)) {
                            pointsTable = teamData.map((team, index) => {
                                var _a, _b;
                                // Safe parsing with fallbacks
                                const parseIntSafe = (value) => {
                                    const parsed = parseInt(value);
                                    return isNaN(parsed) ? 0 : parsed;
                                };
                                const parseFloatSafe = (value) => {
                                    const parsed = parseFloat(value);
                                    return isNaN(parsed) ? 0 : parsed;
                                };
                                const teamInfo = {
                                    teamId: ((_a = team.teamId) === null || _a === void 0 ? void 0 : _a.toString()) || ((_b = team.id) === null || _b === void 0 ? void 0 : _b.toString()) || team.teamName || `team_${index}`,
                                    teamName: team.teamName || team.teamFullName || team.name || 'Unknown Team',
                                    teamShortName: team.teamSName || team.shortName || (team.teamName ? team.teamName.substring(0, 3) : 'UNK'),
                                    played: parseIntSafe(team.matchesPlayed || team.played || team.matches),
                                    won: parseIntSafe(team.matchesWon || team.won || team.wins),
                                    lost: parseIntSafe(team.matchesLost || team.lost || team.losses),
                                    tied: parseIntSafe(team.matchesTied || team.tied || team.ties),
                                    noResult: parseIntSafe(team.matchesNoRes || team.noResult || team.nr),
                                    points: parseIntSafe(team.points || team.pts || team.totalPoints),
                                    netRunRate: parseFloatSafe(team.nrr || team.netRunRate || team.runRate),
                                    position: team.position || (index + 1),
                                    form: Array.isArray(team.form) ? team.form : (Array.isArray(team.recentForm) ? team.recentForm : [])
                                };
                                return teamInfo;
                            });
                        }
                    }
                }
                if (pointsTable.length > 0) {
                    updatedData.pointsTable = pointsTable;
                }
            }
            catch (error) {
                console.error('Error updating points table:', error);
            }
        }
        // Update squads
        if (RAPIDAPI_SERIES_SQUADS_URL) {
            try {
                const baseUrl = RAPIDAPI_SERIES_SQUADS_URL.replace(/\/\d+\/squads$/, '');
                const squadsUrl = `${baseUrl}/${id}/squads`;
                const { rapidApiRateLimiter } = await Promise.resolve().then(() => __importStar(require('../../utils/rateLimiter')));
                const squadsResponse = await rapidApiRateLimiter.makeRequest(squadsUrl, { headers });
                // Debug: Log the actual API response to see the real structure
                console.log('🔍 SQUADS API RESPONSE:', JSON.stringify(squadsResponse, null, 2));
                let squads = [];
                // Try multiple possible response structures
                let squadData = null;
                if (squadsResponse && squadsResponse.squads) {
                    console.log('✅ Found squads in response.squads');
                    squadData = squadsResponse.squads;
                }
                else if (squadsResponse && Array.isArray(squadsResponse)) {
                    console.log('✅ Found squads as direct array');
                    squadData = squadsResponse;
                }
                else if (squadsResponse && squadsResponse.squad) {
                    console.log('✅ Found squads in response.squad');
                    squadData = squadsResponse.squad;
                }
                else {
                    console.log('❌ No recognizable squad data structure found');
                    console.log('Available keys:', Object.keys(squadsResponse || {}));
                }
                if (squadData && Array.isArray(squadData)) {
                    console.log(`📋 Processing ${squadData.length} squads`);
                    squads = squadData.map((squad, squadIndex) => {
                        var _a, _b, _c;
                        console.log(`\n🏏 Processing Squad ${squadIndex + 1}:`, JSON.stringify(squad, null, 2));
                        // Enhanced team name extraction
                        const teamName = squad.teamName ||
                            squad.teamFullName ||
                            squad.name ||
                            ((_a = squad.team) === null || _a === void 0 ? void 0 : _a.teamName) ||
                            'Unknown Team';
                        console.log(`👥 Team Name: ${teamName}`);
                        // Enhanced player extraction
                        let players = [];
                        const playerData = squad.players || squad.player || squad.squadPlayers || [];
                        console.log(`🔍 Player data structure:`, {
                            hasPlayers: !!squad.players,
                            hasPlayer: !!squad.player,
                            hasSquadPlayers: !!squad.squadPlayers,
                            playerDataLength: Array.isArray(playerData) ? playerData.length : 'Not array',
                            firstPlayerSample: Array.isArray(playerData) && playerData[0] ? playerData[0] : 'No players'
                        });
                        if (Array.isArray(playerData)) {
                            console.log(`👨‍💼 Processing ${playerData.length} players for ${teamName}`);
                            players = playerData.map((player, playerIndex) => {
                                var _a, _b, _c, _d, _e, _f;
                                // Try multiple fields for player name with detailed logging
                                const playerName = player.playerName ||
                                    player.fullName ||
                                    player.name ||
                                    ((_a = player.player) === null || _a === void 0 ? void 0 : _a.playerName) ||
                                    ((_b = player.player) === null || _b === void 0 ? void 0 : _b.fullName) ||
                                    ((_c = player.player) === null || _c === void 0 ? void 0 : _c.name) ||
                                    `Player ${playerIndex + 1}`;
                                console.log(`  Player ${playerIndex + 1}: "${playerName}" (from: ${JSON.stringify({
                                    playerName: player.playerName,
                                    fullName: player.fullName,
                                    name: player.name,
                                    nestedPlayerName: (_d = player.player) === null || _d === void 0 ? void 0 : _d.playerName
                                })})`);
                                return {
                                    playerId: ((_e = player.playerId) === null || _e === void 0 ? void 0 : _e.toString()) ||
                                        ((_f = player.id) === null || _f === void 0 ? void 0 : _f.toString()) ||
                                        player.playerName ||
                                        `player_${playerIndex}`,
                                    playerName: playerName,
                                    role: player.role ||
                                        player.playingRole ||
                                        player.battingStyle ||
                                        'All-rounder',
                                    battingStyle: player.battingStyle || '',
                                    bowlingStyle: player.bowlingStyle || '',
                                    isPlaying11: player.isPlaying11 || false,
                                    isCaptain: player.isCaptain || player.captain || false,
                                    isWicketKeeper: player.isWicketKeeper || player.wicketKeeper || false
                                };
                            });
                        }
                        else {
                            console.log(`❌ No valid player data found for ${teamName}`);
                        }
                        const squadInfo = {
                            teamId: ((_b = squad.teamId) === null || _b === void 0 ? void 0 : _b.toString()) || ((_c = squad.id) === null || _c === void 0 ? void 0 : _c.toString()) || teamName,
                            teamName: teamName,
                            players: players,
                            lastUpdated: new Date()
                        };
                        console.log(`✅ Final squad for ${teamName}: ${players.length} players`);
                        return squadInfo;
                    });
                }
                else {
                    console.log('❌ Squad data is not an array or is null');
                }
                if (squads.length > 0) {
                    updatedData.squads = squads;
                }
            }
            catch (error) {
                console.error('Error updating squads:', error);
            }
        }
        // Update the series in database
        if (Object.keys(updatedData).length > 0) {
            await Series_1.default.findOneAndUpdate({ seriesId: id }, { $set: updatedData }, { new: true });
            console.log(`Updated series ${id} with:`, Object.keys(updatedData));
        }
        res.json({
            message: 'Series data updated successfully',
            updated: Object.keys(updatedData),
            seriesId: id
        });
    }
    catch (error) {
        console.error('updateSeriesData error:', error);
        res.status(500).json({ message: 'Failed to update series data', error: error.message });
    }
};
exports.updateSeriesData = updateSeriesData;
// Helper function to map API status to our enum values
const mapStatusToEnum = (status) => {
    if (!status)
        return 'UPCOMING';
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('live') || lowerStatus.includes('in progress') ||
        lowerStatus.includes('innings break') || lowerStatus.includes('rain delay') ||
        lowerStatus.includes('tea break') || lowerStatus.includes('lunch break') ||
        lowerStatus.includes('drinks break')) {
        return 'LIVE';
    }
    if (lowerStatus.includes('complete') || lowerStatus.includes('finished') ||
        lowerStatus.includes('won by') || lowerStatus.includes('match tied') ||
        lowerStatus.includes('no result') || lowerStatus.includes('result')) {
        return 'COMPLETED';
    }
    if (lowerStatus.includes('abandon') || lowerStatus.includes('washed out')) {
        return 'ABANDONED';
    }
    if (lowerStatus.includes('cancel') || lowerStatus.includes('postponed')) {
        return 'CANCELLED';
    }
    if (lowerStatus.includes('match starts') || lowerStatus.includes('starts at') ||
        lowerStatus.includes('upcoming') || lowerStatus.includes('scheduled') ||
        lowerStatus.includes('preview')) {
        return 'UPCOMING';
    }
    if (lowerStatus.match(/\d{1,2}:\d{2}/) || lowerStatus.includes('gmt') || lowerStatus.includes('ist')) {
        return 'UPCOMING';
    }
    return 'UPCOMING';
};
// Function to sync series from RapidAPI
const syncSeriesFromRapidAPI = async (req, res) => {
    var _a, _b, _c;
    try {
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_SERIES_LIST_URL = process.env.RAPIDAPI_SERIES_LIST_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !RAPIDAPI_SERIES_LIST_URL) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY, RAPIDAPI_HOST and RAPIDAPI_SERIES_LIST_URL in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        // Try to fetch series from Cricbuzz API
        const { rapidApiRateLimiter } = await Promise.resolve().then(() => __importStar(require('../../utils/rateLimiter')));
        const response = await rapidApiRateLimiter.makeRequest(RAPIDAPI_SERIES_LIST_URL, { headers });
        if (!response) {
            return res.status(429).json({
                message: 'API rate limit exceeded or request failed. Please try again later.',
                error: 'Too many requests or API unavailable'
            });
        }
        let seriesList = [];
        // Handle different response structures from RapidAPI
        if (response && response.seriesMapProto) {
            // Extract series from seriesMapProto structure
            for (const seriesProto of response.seriesMapProto) {
                if (seriesProto.series && Array.isArray(seriesProto.series)) {
                    seriesList.push(...seriesProto.series);
                }
            }
        }
        else if (Array.isArray(response)) {
            seriesList = response;
        }
        else if (response && response.series) {
            seriesList = response.series;
        }
        else {
            const values = Object.values(response || {});
            const arr = values.find((v) => Array.isArray(v) && v.length && typeof v[0] === 'object');
            if (arr)
                seriesList = arr;
        }
        if (!seriesList || !seriesList.length) {
            return res.status(500).json({
                message: 'No series array found in RapidAPI response. Inspect provider response.',
                providerResponseSample: response
            });
        }
        const upsertPromises = seriesList.map(async (s) => {
            var _a;
            // Extract proper series ID
            const seriesId = (_a = s.id) === null || _a === void 0 ? void 0 : _a.toString();
            if (!seriesId) {
                console.log('Skipping series without ID:', s);
                return null;
            }
            // Parse dates properly (they come as timestamps)
            let startDate = new Date();
            let endDate = new Date();
            if (s.startDt) {
                startDate = new Date(parseInt(s.startDt));
            }
            if (s.endDt) {
                endDate = new Date(parseInt(s.endDt));
            }
            // Determine series status based on dates
            const now = new Date();
            let status = 'UPCOMING';
            if (now >= startDate && now <= endDate) {
                status = 'ONGOING';
            }
            else if (now > endDate) {
                status = 'COMPLETED';
            }
            // Generate short name from full name
            const shortName = s.name ?
                s.name.split(' ').map((word) => word.charAt(0)).join('').substring(0, 10) :
                `S${seriesId}`;
            const doc = {
                seriesId: seriesId,
                name: s.name || 'Unknown Series',
                shortName: shortName,
                description: s.description || s.about || '',
                seriesType: 'INTERNATIONAL', // All from this endpoint are international
                startDate: startDate,
                endDate: endDate,
                venue: {
                    country: 'International', // Will be updated when we get match details
                    cities: []
                },
                teams: [], // Will be populated when we sync matches
                matches: [],
                status: status,
                format: 'MIXED', // Will be determined from matches
                totalMatches: 0, // Will be updated when we sync matches
                completedMatches: 0,
                isActive: status !== 'COMPLETED',
                priority: status === 'ONGOING' ? 10 : status === 'UPCOMING' ? 5 : 1,
                raw: s
            };
            Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);
            console.log('Attempting to save series:', doc.name, doc.seriesId);
            try {
                const result = await Series_1.default.findOneAndUpdate({ seriesId: doc.seriesId }, { $set: doc }, { upsert: true, new: true, setDefaultsOnInsert: true });
                console.log('Successfully saved series:', result.name);
                return result;
            }
            catch (saveError) {
                console.error('Error saving series:', doc.name, saveError.message);
                return null;
            }
        });
        const results = await Promise.all(upsertPromises.filter(p => p !== null));
        console.log('Sync results:', results.length);
        console.log('Sample synced series:', results[0] ? {
            name: results[0].name,
            seriesId: results[0].seriesId,
            status: results[0].status,
            startDate: results[0].startDate,
            endDate: results[0].endDate
        } : 'No results');
        res.json({ message: `Synced ${results.length} series.`, count: results.length });
    }
    catch (error) {
        console.error('syncSeriesFromRapidAPI error:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error);
        // Handle rate limiting
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Series sync failed', error: ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message });
    }
};
exports.syncSeriesFromRapidAPI = syncSeriesFromRapidAPI;
