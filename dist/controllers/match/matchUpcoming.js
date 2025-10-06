"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUpcomingMatches = void 0;
const Match_1 = __importDefault(require("../../models/Match"));
const axios_1 = __importDefault(require("axios"));
const matchUpcomingHelpers_1 = require("./matchUpcomingHelpers");
// Helper function to map API status to our enum values
const mapStatusToEnum = (status) => {
    if (!status)
        return 'UPCOMING';
    // Convert to lowercase for case-insensitive comparison
    const lowerStatus = status.toLowerCase();
    // Map common status values
    if (lowerStatus.includes('live') || lowerStatus.includes('in progress'))
        return 'LIVE';
    if (lowerStatus.includes('complete') || lowerStatus.includes('finished'))
        return 'COMPLETED';
    if (lowerStatus.includes('abandon'))
        return 'ABANDONED';
    if (lowerStatus.includes('cancel'))
        return 'CANCELLED';
    // For upcoming matches with date information
    if (lowerStatus.includes('match starts'))
        return 'UPCOMING';
    // Default fallback
    return 'UPCOMING';
};
const getUpcomingMatches = async (req, res) => {
    var _a;
    try {
        const { limit = 10 } = req.query;
        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
        const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
        const RAPIDAPI_MATCHES_UPCOMING_URL = process.env.RAPIDAPI_MATCHES_UPCOMING_URL;
        // Clean up stale upcoming matches from database (older than 6 hours)
        try {
            const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
            const deleteResult = await Match_1.default.deleteMany({
                status: 'UPCOMING',
                updatedAt: { $lt: sixHoursAgo }
            });
            if (deleteResult.deletedCount > 0) {
                console.log(`Deleted ${deleteResult.deletedCount} stale upcoming matches from database`);
            }
        }
        catch (cleanupError) {
            console.error('Error cleaning up stale upcoming matches:', cleanupError);
        }
        // If API key is available, try to fetch from API first
        if (RAPIDAPI_KEY && RAPIDAPI_HOST && RAPIDAPI_MATCHES_UPCOMING_URL) {
            try {
                console.log('Fetching upcoming matches from API');
                const headers = {
                    'x-rapidapi-key': RAPIDAPI_KEY,
                    'x-rapidapi-host': RAPIDAPI_HOST
                };
                const response = await axios_1.default.get(RAPIDAPI_MATCHES_UPCOMING_URL, { headers, timeout: 15000 });
                // Process API response and save to database
                if (response.data && response.data.typeMatches) {
                    const upcomingMatchesData = response.data.typeMatches.find((type) => type.matchType === 'Upcoming Matches');
                    if (upcomingMatchesData && upcomingMatchesData.seriesMatches) {
                        const matchesList = [];
                        // Extract matches from series
                        for (const seriesMatch of upcomingMatchesData.seriesMatches) {
                            if (seriesMatch.seriesAdWrapper && seriesMatch.seriesAdWrapper.matches) {
                                matchesList.push(...seriesMatch.seriesAdWrapper.matches);
                            }
                        }
                        // Process and save each match
                        const upsertPromises = matchesList.map(async (m) => {
                            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
                            const matchId = ((_a = m.matchInfo) === null || _a === void 0 ? void 0 : _a.matchId) || m.id || m.matchId || JSON.stringify(m).slice(0, 40);
                            // Extract series information
                            const seriesId = ((_b = m.matchInfo) === null || _b === void 0 ? void 0 : _b.seriesId) || '0';
                            const seriesName = ((_c = m.matchInfo) === null || _c === void 0 ? void 0 : _c.seriesName) || 'Unknown Series';
                            // Extract team information
                            const team1Info = ((_d = m.matchInfo) === null || _d === void 0 ? void 0 : _d.team1) || m.teamA || m.team1 || {};
                            const team2Info = ((_e = m.matchInfo) === null || _e === void 0 ? void 0 : _e.team2) || m.teamB || m.team2 || {};
                            const team1Name = team1Info.teamName || team1Info.teamSName || team1Info.name || 'Team 1';
                            const team2Name = team2Info.teamName || team2Info.teamSName || team2Info.name || 'Team 2';
                            const team1Id = team1Info.teamId || team1Info.id || '1';
                            const team2Id = team2Info.teamId || team2Info.id || '2';
                            // Extract format and status
                            const format = ((_f = m.matchInfo) === null || _f === void 0 ? void 0 : _f.matchFormat) || ((_g = m.matchInfo) === null || _g === void 0 ? void 0 : _g.matchType) || m.format || m.type || m.matchType || 'Other';
                            const title = ((_h = m.matchInfo) === null || _h === void 0 ? void 0 : _h.matchDesc) || m.title || m.name || `${team1Name} vs ${team2Name}`;
                            const rawStatus = ((_j = m.matchInfo) === null || _j === void 0 ? void 0 : _j.status) || ((_k = m.matchInfo) === null || _k === void 0 ? void 0 : _k.state) || m.status || m.matchStatus || 'UPCOMING';
                            const mappedStatus = mapStatusToEnum(rawStatus);
                            // Check if match should be live based on time
                            const matchStartTime = ((_l = m.matchInfo) === null || _l === void 0 ? void 0 : _l.startDate) ? new Date(parseInt(m.matchInfo.startDate)) : null;
                            const currentTime = new Date();
                            const shouldBeLive = matchStartTime &&
                                matchStartTime <= currentTime &&
                                (currentTime.getTime() - matchStartTime.getTime()) < (8 * 60 * 60 * 1000) && // Started within 8 hours
                                mappedStatus === 'UPCOMING'; // Only override if currently upcoming
                            const status = shouldBeLive ? 'LIVE' : mappedStatus;
                            // Extract venue information
                            const venueName = ((_o = (_m = m.matchInfo) === null || _m === void 0 ? void 0 : _m.venueInfo) === null || _o === void 0 ? void 0 : _o.ground) || ((_p = m.matchInfo) === null || _p === void 0 ? void 0 : _p.venue) || ((_q = m.venue) === null || _q === void 0 ? void 0 : _q.name) || m.venue || 'Venue TBD';
                            const venueCity = ((_s = (_r = m.matchInfo) === null || _r === void 0 ? void 0 : _r.venueInfo) === null || _s === void 0 ? void 0 : _s.city) || ((_t = m.venue) === null || _t === void 0 ? void 0 : _t.city) || '';
                            const venueCountry = ((_v = (_u = m.matchInfo) === null || _u === void 0 ? void 0 : _u.venueInfo) === null || _v === void 0 ? void 0 : _v.country) || ((_w = m.venue) === null || _w === void 0 ? void 0 : _w.country) || '';
                            // Extract date information
                            let startDate = null;
                            if ((_x = m.matchInfo) === null || _x === void 0 ? void 0 : _x.startDate)
                                startDate = new Date(parseInt(m.matchInfo.startDate));
                            else if (m.startDate)
                                startDate = new Date(m.startDate);
                            else if (m.date)
                                startDate = new Date(m.date);
                            // Create teams array in the expected format
                            const teams = [
                                {
                                    teamId: team1Id.toString(),
                                    teamName: team1Name,
                                    teamShortName: team1Info.teamSName || team1Name.substring(0, 3),
                                    score: {
                                        runs: 0,
                                        wickets: 0,
                                        overs: 0
                                    }
                                },
                                {
                                    teamId: team2Id.toString(),
                                    teamName: team2Name,
                                    teamShortName: team2Info.teamSName || team2Name.substring(0, 3),
                                    score: {
                                        runs: 0,
                                        wickets: 0,
                                        overs: 0
                                    }
                                }
                            ];
                            const doc = {
                                matchId: matchId === null || matchId === void 0 ? void 0 : matchId.toString(),
                                format: format || 'Other',
                                title,
                                shortTitle: ((_y = m.matchInfo) === null || _y === void 0 ? void 0 : _y.shortDesc) || title,
                                series: {
                                    id: seriesId.toString(),
                                    name: seriesName,
                                    seriesType: 'INTERNATIONAL' // Default value
                                },
                                teams,
                                status,
                                venue: {
                                    name: venueName,
                                    city: venueCity,
                                    country: venueCountry
                                },
                                startDate: startDate && !isNaN(startDate.getTime()) ? startDate : undefined,
                                isLive: status === 'LIVE',
                                raw: m
                            };
                            Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);
                            return Match_1.default.findOneAndUpdate({ matchId: doc.matchId }, { $set: doc }, { upsert: true, new: true, setDefaultsOnInsert: true });
                        });
                        await Promise.all(upsertPromises);
                        // Return from database after saving - only UPCOMING matches
                        const upcomingMatches = await Match_1.default.find({
                            status: 'UPCOMING',
                            startDate: { $gte: new Date() } // Only future matches
                        })
                            .sort({ startDate: 1 })
                            .limit(Number(limit) * 2) // Get more to filter
                            .select('matchId title shortTitle teams venue series startDate format status raw');
                        // Filter out any matches that aren't actually upcoming
                        const validUpcomingMatches = upcomingMatches.filter(match => {
                            // Double-check the status
                            if (match.status !== 'UPCOMING')
                                return false;
                            // Check raw data if available
                            if (match.raw) {
                                const rawState = (match.raw.state || '').toLowerCase();
                                const rawStatus = (match.raw.status || '').toLowerCase();
                                // Skip if raw data indicates it's completed or live
                                if (rawState.includes('complete') || rawState.includes('live') ||
                                    rawStatus.includes('complete') || rawStatus.includes('live') ||
                                    rawState.includes('finished') || rawStatus.includes('won')) {
                                    return false;
                                }
                            }
                            return true;
                        }).slice(0, Number(limit)); // Limit after filtering
                        return res.json(validUpcomingMatches);
                    }
                }
            }
            catch (apiError) {
                console.error('API fetch failed for upcoming matches:', apiError);
                // Continue to fallback logic
            }
        }
        // Fallback to database if API config is missing or API call failed - only UPCOMING matches
        console.log('Falling back to database for upcoming matches');
        const dbMatches = await Match_1.default.find({
            status: 'UPCOMING',
            startDate: { $gte: new Date() } // Only future matches
        })
            .sort({ startDate: 1 })
            .limit(Number(limit) * 2) // Get more to filter
            .select('matchId title shortTitle teams venue series startDate format status raw');
        // Process matches to extract data from raw field if needed
        const processedMatches = dbMatches.map(match => {
            // If the match doesn't have proper data but has raw data, extract from raw
            if ((!match.title || match.title === ' vs ' || !match.teams || match.teams.length === 0) && match.raw) {
                return (0, matchUpcomingHelpers_1.processRawMatchData)(match);
            }
            return match;
        });
        // Filter out any non-upcoming matches
        const validMatches = processedMatches.filter(match => {
            if (match.status !== 'UPCOMING') {
                console.log(`Filtering out match ${match.matchId} - status is ${match.status}, not UPCOMING`);
                return false;
            }
            // Check raw data if available
            if (match.raw) {
                const rawState = (match.raw.state || '').toLowerCase();
                const rawStatus = (match.raw.status || '').toLowerCase();
                if (rawState.includes('complete') || rawState.includes('live') ||
                    rawStatus.includes('complete') || rawStatus.includes('live') ||
                    rawState.includes('finished') || rawStatus.includes('won')) {
                    console.log(`Filtering out match ${match.matchId} - raw data indicates not upcoming`);
                    return false;
                }
            }
            return true;
        }).slice(0, Number(limit)); // Limit after filtering
        console.log(`Returning ${validMatches.length} valid upcoming matches (filtered from ${processedMatches.length})`);
        return res.json(validMatches);
    }
    catch (error) {
        console.error('getUpcomingMatches error:', error);
        // Handle rate limiting
        if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
            // Fallback to database if API rate limit exceeded
            try {
                const { limit = 10 } = req.query;
                const upcomingMatches = await Match_1.default.find({
                    status: 'UPCOMING',
                    startDate: { $gte: new Date() }
                })
                    .sort({ startDate: 1 })
                    .limit(Number(limit))
                    .select('matchId title shortTitle teams venue series startDate format status');
                return res.json(upcomingMatches);
            }
            catch (dbError) {
                return res.status(500).json({ message: 'Server error', error: dbError.message });
            }
        }
        // Fallback to database if API fails
        try {
            const { limit = 10 } = req.query;
            const upcomingMatches = await Match_1.default.find({
                status: 'UPCOMING',
                startDate: { $gte: new Date() }
            })
                .sort({ startDate: 1 })
                .limit(Number(limit))
                .select('matchId title shortTitle teams venue series startDate format status');
            res.json(upcomingMatches);
        }
        catch (dbError) {
            res.status(500).json({ message: 'Server error', error: dbError.message });
        }
    }
};
exports.getUpcomingMatches = getUpcomingMatches;
