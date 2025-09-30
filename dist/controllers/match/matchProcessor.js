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
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAndSaveMatch = processAndSaveMatch;
// Helper function to map API status to our enum values
const mapStatusToEnum = (status) => {
    if (!status)
        return 'UPCOMING';
    // Convert to lowercase for case-insensitive comparison
    const lowerStatus = status.toLowerCase();
    // Map LIVE status patterns
    if (lowerStatus.includes('live') ||
        lowerStatus.includes('in progress') ||
        lowerStatus.includes('innings break') ||
        lowerStatus.includes('rain delay') ||
        lowerStatus.includes('tea break') ||
        lowerStatus.includes('lunch break') ||
        lowerStatus.includes('drinks break') ||
        lowerStatus === 'live') {
        return 'LIVE';
    }
    // Map COMPLETED status patterns
    if (lowerStatus.includes('complete') ||
        lowerStatus.includes('finished') ||
        lowerStatus.includes('won by') ||
        lowerStatus.includes('match tied') ||
        lowerStatus.includes('no result') ||
        lowerStatus.includes('result') ||
        lowerStatus === 'completed' ||
        lowerStatus === 'finished') {
        return 'COMPLETED';
    }
    // Map ABANDONED status patterns
    if (lowerStatus.includes('abandon') ||
        lowerStatus.includes('washed out') ||
        lowerStatus === 'abandoned') {
        return 'ABANDONED';
    }
    // Map CANCELLED status patterns
    if (lowerStatus.includes('cancel') ||
        lowerStatus.includes('postponed') ||
        lowerStatus === 'cancelled') {
        return 'CANCELLED';
    }
    // Map UPCOMING status patterns
    if (lowerStatus.includes('match starts') ||
        lowerStatus.includes('starts at') ||
        lowerStatus.includes('upcoming') ||
        lowerStatus.includes('scheduled') ||
        lowerStatus.includes('preview') ||
        lowerStatus === 'upcoming' ||
        lowerStatus === 'scheduled') {
        return 'UPCOMING';
    }
    // If we can't determine the status, try to make an educated guess
    // Check if it contains time information (likely upcoming)
    if (lowerStatus.match(/\d{1,2}:\d{2}/) || lowerStatus.includes('gmt') || lowerStatus.includes('ist')) {
        return 'UPCOMING';
    }
    // Default fallback
    return 'UPCOMING';
};
// Helper function to process and save a single match
async function processAndSaveMatch(m) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20;
    const Match = (await Promise.resolve().then(() => __importStar(require('../../models/Match')))).default;
    const matchId = ((_a = m.matchInfo) === null || _a === void 0 ? void 0 : _a.matchId) || m.matchId || m.id || m.match_id || JSON.stringify(m).slice(0, 40);
    // Extract series information
    const seriesName = ((_b = m.matchInfo) === null || _b === void 0 ? void 0 : _b.seriesName) || ((_c = m.series) === null || _c === void 0 ? void 0 : _c.name) || m.tournament || 'Unknown Series';
    const seriesId = ((_d = m.matchInfo) === null || _d === void 0 ? void 0 : _d.seriesId) || ((_e = m.series) === null || _e === void 0 ? void 0 : _e.id) || m.tournamentId || '0';
    // Extract team information
    const team1Info = ((_f = m.matchInfo) === null || _f === void 0 ? void 0 : _f.team1) || m.teamA || m.team1 || {};
    const team2Info = ((_g = m.matchInfo) === null || _g === void 0 ? void 0 : _g.team2) || m.teamB || m.team2 || {};
    const team1Name = team1Info.teamName || team1Info.teamSName || team1Info.name || 'Team 1';
    const team2Name = team2Info.teamName || team2Info.teamSName || team2Info.name || 'Team 2';
    const team1Id = team1Info.teamId || team1Info.id || '1';
    const team2Id = team2Info.teamId || team2Info.id || '2';
    // Extract format and status
    const format = ((_h = m.matchInfo) === null || _h === void 0 ? void 0 : _h.matchFormat) || ((_j = m.matchInfo) === null || _j === void 0 ? void 0 : _j.matchType) || m.format || m.type || m.matchType || 'Other';
    const title = ((_k = m.matchInfo) === null || _k === void 0 ? void 0 : _k.matchDesc) || m.title || m.name || `${team1Name} vs ${team2Name}`;
    const rawStatus = ((_l = m.matchInfo) === null || _l === void 0 ? void 0 : _l.status) || ((_m = m.matchInfo) === null || _m === void 0 ? void 0 : _m.state) || m.status || m.matchStatus || 'LIVE';
    const status = mapStatusToEnum(rawStatus);
    // Extract venue information
    const venueName = ((_p = (_o = m.matchInfo) === null || _o === void 0 ? void 0 : _o.venueInfo) === null || _p === void 0 ? void 0 : _p.ground) || ((_q = m.matchInfo) === null || _q === void 0 ? void 0 : _q.venue) || ((_r = m.venue) === null || _r === void 0 ? void 0 : _r.name) || m.venue || 'Venue TBD';
    const venueCity = ((_t = (_s = m.matchInfo) === null || _s === void 0 ? void 0 : _s.venueInfo) === null || _t === void 0 ? void 0 : _t.city) || ((_u = m.venue) === null || _u === void 0 ? void 0 : _u.city) || '';
    const venueCountry = ((_w = (_v = m.matchInfo) === null || _v === void 0 ? void 0 : _v.venueInfo) === null || _w === void 0 ? void 0 : _w.country) || ((_x = m.venue) === null || _x === void 0 ? void 0 : _x.country) || '';
    // Extract date information
    let startDate = null;
    if ((_y = m.matchInfo) === null || _y === void 0 ? void 0 : _y.startDate)
        startDate = new Date(parseInt(m.matchInfo.startDate));
    else if (m.startDate)
        startDate = new Date(m.startDate);
    else if (m.date)
        startDate = new Date(m.date);
    // Extract score information
    const innings = ((_z = m.matchScore) === null || _z === void 0 ? void 0 : _z.scoreData) || m.innings || m.matchScore || [];
    // Create teams array in the expected format
    const teams = [
        {
            teamId: team1Id.toString(),
            teamName: team1Name,
            teamShortName: team1Info.teamSName || team1Name.substring(0, 3),
            score: {
                runs: ((_0 = innings[0]) === null || _0 === void 0 ? void 0 : _0.runs) || ((_1 = innings.inngs1) === null || _1 === void 0 ? void 0 : _1.runs) || 0,
                wickets: ((_2 = innings[0]) === null || _2 === void 0 ? void 0 : _2.wickets) || ((_3 = innings.inngs1) === null || _3 === void 0 ? void 0 : _3.wickets) || 0,
                overs: ((_4 = innings[0]) === null || _4 === void 0 ? void 0 : _4.overs) || ((_5 = innings.inngs1) === null || _5 === void 0 ? void 0 : _5.overs) || 0,
                balls: ((_6 = innings[0]) === null || _6 === void 0 ? void 0 : _6.balls) || ((_7 = innings.inngs1) === null || _7 === void 0 ? void 0 : _7.balls) || 0,
                runRate: ((_8 = innings[0]) === null || _8 === void 0 ? void 0 : _8.runRate) || ((_9 = innings.inngs1) === null || _9 === void 0 ? void 0 : _9.runRate) || 0
            }
        },
        {
            teamId: team2Id.toString(),
            teamName: team2Name,
            teamShortName: team2Info.teamSName || team2Name.substring(0, 3),
            score: {
                runs: ((_10 = innings[1]) === null || _10 === void 0 ? void 0 : _10.runs) || ((_11 = innings.inngs2) === null || _11 === void 0 ? void 0 : _11.runs) || 0,
                wickets: ((_12 = innings[1]) === null || _12 === void 0 ? void 0 : _12.wickets) || ((_13 = innings.inngs2) === null || _13 === void 0 ? void 0 : _13.wickets) || 0,
                overs: ((_14 = innings[1]) === null || _14 === void 0 ? void 0 : _14.overs) || ((_15 = innings.inngs2) === null || _15 === void 0 ? void 0 : _15.overs) || 0,
                balls: ((_16 = innings[1]) === null || _16 === void 0 ? void 0 : _16.balls) || ((_17 = innings.inngs2) === null || _17 === void 0 ? void 0 : _17.balls) || 0,
                runRate: ((_18 = innings[1]) === null || _18 === void 0 ? void 0 : _18.runRate) || ((_19 = innings.inngs2) === null || _19 === void 0 ? void 0 : _19.runRate) || 0
            }
        }
    ];
    const doc = {
        matchId: matchId === null || matchId === void 0 ? void 0 : matchId.toString(),
        format: format || 'Other',
        title,
        shortTitle: ((_20 = m.matchInfo) === null || _20 === void 0 ? void 0 : _20.shortDesc) || title,
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
        isLive: true,
        raw: m
    };
    Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);
    return Match.findOneAndUpdate({ matchId: doc.matchId }, { $set: doc }, { upsert: true, new: true, setDefaultsOnInsert: true });
}
