"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncSeriesDetails = void 0;
const axios_1 = __importDefault(require("axios"));
const Series_1 = __importDefault(require("../../models/Series"));
// Function to sync comprehensive series details
const syncSeriesDetails = async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_SERIES_MATCHES_URL = process.env.RAPIDAPI_SERIES_MATCHES_URL;
        const RAPIDAPI_SERIES_SQUADS_URL = process.env.RAPIDAPI_SERIES_SQUADS_URL;
        const RAPIDAPI_SERIES_VENUES_URL = process.env.RAPIDAPI_SERIES_VENUES_URL;
        const RAPIDAPI_SERIES_POINTS_TABLE_URL = process.env.RAPIDAPI_SERIES_POINTS_TABLE_URL;
        const RAPIDAPI_SERIES_STATS_URL = process.env.RAPIDAPI_SERIES_STATS_URL;
        if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
            return res.status(500).json({
                message: 'RapidAPI config is missing. Please set RAPIDAPI_KEY and RAPIDAPI_HOST in .env'
            });
        }
        const headers = {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST
        };
        console.log(`Starting comprehensive sync for series ${id}`);
        // Fetch series matches/schedule
        let schedule = [];
        let venues = [];
        let series = null;
        if (RAPIDAPI_SERIES_MATCHES_URL) {
            try {
                const matchesUrl = RAPIDAPI_SERIES_MATCHES_URL.replace('3641', id);
                console.log('Fetching series matches from:', matchesUrl);
                const matchesResponse = await axios_1.default.get(matchesUrl, { headers, timeout: 15000 });
                if (matchesResponse.data && matchesResponse.data.matchDetails) {
                    // Extract teams and venue information
                    const teamsSet = new Set();
                    const venuesSet = new Set();
                    let formatCounts = {};
                    matchesResponse.data.matchDetails.forEach((matchDetail) => {
                        if (matchDetail.matchDetailsMap && matchDetail.matchDetailsMap.match) {
                            matchDetail.matchDetailsMap.match.forEach((match) => {
                                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
                                if (match.matchInfo) {
                                    const matchInfo = match.matchInfo;
                                    // Extract match details
                                    const matchData = {
                                        matchId: (_a = matchInfo.matchId) === null || _a === void 0 ? void 0 : _a.toString(),
                                        matchDesc: matchInfo.matchDesc || `Match ${schedule.length + 1}`,
                                        team1: ((_b = matchInfo.team1) === null || _b === void 0 ? void 0 : _b.teamName) || 'Team 1',
                                        team2: ((_c = matchInfo.team2) === null || _c === void 0 ? void 0 : _c.teamName) || 'Team 2',
                                        startDate: matchInfo.startDate ? new Date(parseInt(matchInfo.startDate)) : new Date(),
                                        venue: ((_d = matchInfo.venueInfo) === null || _d === void 0 ? void 0 : _d.ground) || 'TBA',
                                        status: matchInfo.state || 'UPCOMING',
                                        format: matchInfo.matchFormat || 'T20'
                                    };
                                    schedule.push(matchData);
                                    // Collect teams
                                    if ((_e = matchInfo.team1) === null || _e === void 0 ? void 0 : _e.teamName) {
                                        teamsSet.add(JSON.stringify({
                                            teamId: ((_f = matchInfo.team1.teamId) === null || _f === void 0 ? void 0 : _f.toString()) || matchInfo.team1.teamName,
                                            teamName: matchInfo.team1.teamName,
                                            teamShortName: matchInfo.team1.teamSName || matchInfo.team1.teamName
                                        }));
                                    }
                                    if ((_g = matchInfo.team2) === null || _g === void 0 ? void 0 : _g.teamName) {
                                        teamsSet.add(JSON.stringify({
                                            teamId: ((_h = matchInfo.team2.teamId) === null || _h === void 0 ? void 0 : _h.toString()) || matchInfo.team2.teamName,
                                            teamName: matchInfo.team2.teamName,
                                            teamShortName: matchInfo.team2.teamSName || matchInfo.team2.teamName
                                        }));
                                    }
                                    // Collect venues
                                    if ((_j = matchInfo.venueInfo) === null || _j === void 0 ? void 0 : _j.ground) {
                                        venuesSet.add(JSON.stringify({
                                            venueId: ((_k = matchInfo.venueInfo.id) === null || _k === void 0 ? void 0 : _k.toString()) || matchInfo.venueInfo.ground,
                                            venueName: matchInfo.venueInfo.ground,
                                            city: matchInfo.venueInfo.city || '',
                                            country: matchInfo.venueInfo.country || '',
                                            matches: [(_l = matchInfo.matchId) === null || _l === void 0 ? void 0 : _l.toString()]
                                        }));
                                    }
                                    // Count formats
                                    const format = matchInfo.matchFormat || 'T20';
                                    formatCounts[format] = (formatCounts[format] || 0) + 1;
                                }
                            });
                        }
                    });
                    // Convert sets back to arrays
                    const teams = Array.from(teamsSet).map(teamStr => JSON.parse(teamStr));
                    venues = Array.from(venuesSet).map(venueStr => JSON.parse(venueStr));
                    // Determine primary format
                    const primaryFormat = Object.keys(formatCounts).reduce((a, b) => formatCounts[a] > formatCounts[b] ? a : b, 'MIXED');
                    // Find or create series in database
                    series = await Series_1.default.findOne({ seriesId: id });
                    if (!series) {
                        // Create new series entry with required fields
                        series = new Series_1.default({
                            seriesId: id,
                            name: `Series ${id}`,
                            shortName: `S${id}`,
                            seriesType: 'INTERNATIONAL',
                            startDate: new Date(),
                            endDate: new Date(),
                            venue: { country: 'International', cities: [] },
                            teams: [],
                            format: 'MIXED',
                            totalMatches: schedule.length || 0,
                            status: 'ONGOING'
                        });
                    }
                    else {
                        // Ensure existing series has required fields
                        if (!series.shortName) {
                            series.shortName = series.name || `S${id}`;
                        }
                        if (!series.venue || !series.venue.country) {
                            series.venue = { country: 'International', cities: [] };
                        }
                    }
                    // Update series with extracted data
                    if (series) {
                        series.teams = teams;
                        series.totalMatches = schedule.length;
                        series.format = Object.keys(formatCounts).length > 1 ? 'MIXED' : primaryFormat;
                        // Update venue country from first venue
                        if (venues.length > 0 && venues[0].country) {
                            series.venue.country = venues[0].country;
                            series.venue.cities = venues.map((v) => v.city).filter(Boolean);
                        }
                    }
                }
            }
            catch (error) {
                console.error('Failed to fetch series matches:', error);
            }
        }
        // Fetch series squads
        let squads = [];
        if (RAPIDAPI_SERIES_SQUADS_URL) {
            try {
                const squadsUrl = RAPIDAPI_SERIES_SQUADS_URL.replace('3718', id);
                console.log('Fetching series squads from:', squadsUrl);
                const squadsResponse = await axios_1.default.get(squadsUrl, { headers, timeout: 15000 });
                if (squadsResponse.data && squadsResponse.data.squads) {
                    squads = squadsResponse.data.squads.map((squad) => {
                        var _a;
                        return ({
                            teamId: ((_a = squad.teamId) === null || _a === void 0 ? void 0 : _a.toString()) || squad.teamName,
                            teamName: squad.teamName || squad.teamFullName || 'Unknown Team',
                            players: (squad.players || []).map((player) => {
                                var _a;
                                return ({
                                    playerId: ((_a = player.playerId) === null || _a === void 0 ? void 0 : _a.toString()) || player.playerName,
                                    playerName: player.playerName || player.fullName || 'Unknown Player',
                                    role: player.role || player.battingStyle || 'All-rounder',
                                    battingStyle: player.battingStyle || '',
                                    bowlingStyle: player.bowlingStyle || '',
                                    isPlaying11: player.isPlaying11 || false,
                                    isCaptain: player.isCaptain || player.captain || false,
                                    isWicketKeeper: player.isWicketKeeper || player.wicketKeeper || false
                                });
                            }),
                            lastUpdated: new Date()
                        });
                    });
                }
            }
            catch (error) {
                console.error('Failed to fetch series squads:', error);
            }
        }
        // Fetch series venues
        if (RAPIDAPI_SERIES_VENUES_URL) {
            try {
                const venuesUrl = RAPIDAPI_SERIES_VENUES_URL.replace('3718', id);
                console.log('Fetching series venues from:', venuesUrl);
                const venuesResponse = await axios_1.default.get(venuesUrl, { headers, timeout: 15000 });
                if (venuesResponse.data && venuesResponse.data.venues) {
                    venues = venuesResponse.data.venues.map((venue) => {
                        var _a;
                        return ({
                            venueId: ((_a = venue.venueId) === null || _a === void 0 ? void 0 : _a.toString()) || venue.venueName,
                            venueName: venue.venueName || venue.ground || 'Unknown Venue',
                            city: venue.city || '',
                            country: venue.country || '',
                            capacity: venue.capacity || 0,
                            pitchType: venue.pitchType || '',
                            matches: venue.matches || []
                        });
                    });
                }
            }
            catch (error) {
                console.error('Failed to fetch series venues:', error);
            }
        }
        // Fetch points table
        let pointsTable = [];
        if (RAPIDAPI_SERIES_POINTS_TABLE_URL) {
            try {
                const pointsUrl = RAPIDAPI_SERIES_POINTS_TABLE_URL.replace('3718', id);
                console.log('Fetching series points table from:', pointsUrl);
                const pointsResponse = await axios_1.default.get(pointsUrl, { headers, timeout: 15000 });
                if (pointsResponse.data && pointsResponse.data.pointsTable) {
                    const tableData = pointsResponse.data.pointsTable[0] || pointsResponse.data.pointsTable;
                    if (tableData && tableData.pointsTableInfo) {
                        pointsTable = tableData.pointsTableInfo.map((team, index) => {
                            var _a;
                            return ({
                                teamId: ((_a = team.teamId) === null || _a === void 0 ? void 0 : _a.toString()) || team.teamName,
                                teamName: team.teamName || team.teamFullName || 'Unknown Team',
                                teamShortName: team.teamSName || team.teamName || 'UNK',
                                played: team.matchesPlayed || team.played || 0,
                                won: team.matchesWon || team.won || 0,
                                lost: team.matchesLost || team.lost || 0,
                                tied: team.matchesTied || team.tied || 0,
                                noResult: team.matchesNoRes || team.noResult || 0,
                                points: team.points || 0,
                                netRunRate: team.nrr || team.netRunRate || 0,
                                position: index + 1,
                                form: team.form || []
                            });
                        });
                    }
                }
            }
            catch (error) {
                console.error('Failed to fetch series points table:', error);
            }
        }
        // Fetch series stats
        let stats = null;
        if (RAPIDAPI_SERIES_STATS_URL) {
            try {
                const statsUrl = RAPIDAPI_SERIES_STATS_URL.replace('3718', id);
                console.log('Fetching series stats from:', statsUrl);
                const statsResponse = await axios_1.default.get(statsUrl, { headers, timeout: 15000 });
                if (statsResponse.data) {
                    stats = {
                        topRunScorers: statsResponse.data.topRunScorers || [],
                        topWicketTakers: statsResponse.data.topWicketTakers || [],
                        lastUpdated: new Date()
                    };
                }
            }
            catch (error) {
                console.error('Failed to fetch series stats:', error);
            }
        }
        // Find or create series in database (if not already done)
        if (!series) {
            series = await Series_1.default.findOne({ seriesId: id });
            if (!series) {
                // Create new series entry with required fields
                series = new Series_1.default({
                    seriesId: id,
                    name: `Series ${id}`,
                    shortName: `S${id}`,
                    seriesType: 'INTERNATIONAL',
                    startDate: new Date(),
                    endDate: new Date(),
                    venue: { country: 'International', cities: [] },
                    teams: [],
                    format: 'MIXED',
                    totalMatches: schedule.length || 0,
                    status: 'ONGOING'
                });
            }
            else {
                // Ensure existing series has required fields
                if (!series.shortName) {
                    series.shortName = series.name || `S${id}`;
                }
                if (!series.venue || !series.venue.country) {
                    series.venue = { country: 'International', cities: [] };
                }
            }
        }
        // Update series with fetched data
        if (schedule.length > 0) {
            series.schedule = schedule;
            series.totalMatches = schedule.length;
        }
        if (squads.length > 0) {
            series.squads = squads;
        }
        if (venues.length > 0) {
            series.venues = venues;
        }
        if (pointsTable.length > 0) {
            series.pointsTable = pointsTable;
        }
        if (stats) {
            series.stats = stats;
        }
        await series.save();
        console.log(`Successfully synced series ${id} with comprehensive data`);
        return res.json({
            message: `Successfully synced series ${id} with comprehensive data`,
            series: series,
            hasSchedule: schedule.length > 0,
            hasSquads: squads.length > 0,
            hasVenues: venues.length > 0,
            hasPointsTable: pointsTable.length > 0,
            hasStats: !!stats
        });
    }
    catch (error) {
        console.error('syncSeriesDetails error:', error);
        // Handle rate limiting
        if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
            return res.status(429).json({
                message: 'API rate limit exceeded. Please try again later.',
                error: 'Too many requests'
            });
        }
        res.status(500).json({ message: 'Failed to sync series details', error: error.message });
    }
};
exports.syncSeriesDetails = syncSeriesDetails;
