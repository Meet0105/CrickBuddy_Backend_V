"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const PlayerSchema = new mongoose_1.default.Schema({
    playerId: { type: String, required: true },
    playerName: { type: String, required: true },
    role: { type: String, required: true },
    battingStyle: String,
    bowlingStyle: String,
    isPlaying11: { type: Boolean, default: false },
    isCaptain: { type: Boolean, default: false },
    isWicketKeeper: { type: Boolean, default: false }
}, { _id: false });
const SquadSchema = new mongoose_1.default.Schema({
    teamId: { type: String, required: true },
    teamName: { type: String, required: true },
    players: [PlayerSchema],
    lastUpdated: { type: Date, default: Date.now }
}, { _id: false });
const VenueSchema = new mongoose_1.default.Schema({
    venueId: { type: String, required: true },
    venueName: { type: String, required: true },
    city: String,
    country: String,
    capacity: Number,
    pitchType: String,
    matches: [String]
}, { _id: false });
const PointsTableSchema = new mongoose_1.default.Schema({
    teamId: { type: String, required: true },
    teamName: { type: String, required: true },
    teamShortName: String,
    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    tied: { type: Number, default: 0 },
    noResult: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    netRunRate: Number,
    position: { type: Number, required: true },
    form: [String]
}, { _id: false });
const ScheduleMatchSchema = new mongoose_1.default.Schema({
    matchId: String,
    matchDesc: String,
    team1: String,
    team2: String,
    startDate: Date,
    venue: String,
    status: String,
    format: String
}, { _id: false });
const SeriesSchema = new mongoose_1.default.Schema({
    seriesId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    shortName: { type: String, required: true },
    description: String,
    seriesType: {
        type: String,
        enum: ['INTERNATIONAL', 'DOMESTIC', 'LEAGUE', 'WOMEN'],
        required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    venue: {
        country: { type: String, required: true },
        cities: [String]
    },
    teams: [{
            teamId: { type: String, required: true },
            teamName: { type: String, required: true },
            teamShortName: { type: String, required: true },
            isHost: { type: Boolean, default: false }
        }],
    matches: [String],
    schedule: [ScheduleMatchSchema],
    squads: [SquadSchema],
    venues: [VenueSchema],
    pointsTable: [PointsTableSchema],
    standings: [{
            teamId: String,
            played: { type: Number, default: 0 },
            won: { type: Number, default: 0 },
            lost: { type: Number, default: 0 },
            tied: { type: Number, default: 0 },
            noResult: { type: Number, default: 0 },
            points: { type: Number, default: 0 },
            netRunRate: Number,
            position: Number
        }],
    status: {
        type: String,
        enum: ['UPCOMING', 'ONGOING', 'COMPLETED', 'POSTPONED', 'CANCELLED'],
        default: 'UPCOMING'
    },
    format: {
        type: String,
        enum: ['T20', 'ODI', 'TEST', 'MIXED'],
        required: true
    },
    totalMatches: { type: Number, required: true },
    completedMatches: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    featuredImage: String,
    sponsors: [String],
    stats: {
        topRunScorers: [mongoose_1.default.Schema.Types.Mixed],
        topWicketTakers: [mongoose_1.default.Schema.Types.Mixed],
        lastUpdated: Date
    },
    raw: mongoose_1.default.Schema.Types.Mixed
}, { timestamps: true });
// Indexes
SeriesSchema.index({ status: 1, startDate: -1 });
SeriesSchema.index({ seriesType: 1, isActive: 1 });
SeriesSchema.index({ priority: -1, startDate: -1 });
exports.default = mongoose_1.default.model('Series', SeriesSchema);
