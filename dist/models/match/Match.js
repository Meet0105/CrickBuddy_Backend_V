"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const schemas_1 = require("./schemas");
const MatchSchema = new mongoose_1.default.Schema({
    matchId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    shortTitle: String,
    subTitle: String,
    format: {
        type: String,
        enum: ['T20', 'ODI', 'TEST', 'T10', 'HUNDRED', 'OTHER'],
        default: 'OTHER'
    },
    status: {
        type: String,
        enum: ['UPCOMING', 'LIVE', 'COMPLETED', 'ABANDONED', 'CANCELLED'],
        default: 'UPCOMING'
    },
    tossResults: {
        tossWinnerTeam: String,
        decision: { type: String, enum: ['BAT', 'BOWL'] }
    },
    venue: {
        name: { type: String, required: true },
        city: String,
        country: String
    },
    startDate: { type: Date, required: true },
    endDate: Date,
    series: {
        id: { type: String, required: true },
        name: { type: String, required: true },
        seriesType: {
            type: String,
            enum: ['INTERNATIONAL', 'DOMESTIC', 'LEAGUE', 'WOMEN'],
            default: 'DOMESTIC'
        }
    },
    teams: [schemas_1.TeamScoreSchema],
    currentlyPlaying: {
        teamId: String,
        innings: Number
    },
    result: {
        winnerTeam: String,
        winType: { type: String, enum: ['RUNS', 'WICKETS', 'BALLS', 'INNINGS'] },
        winMargin: Number,
        resultText: String
    },
    // Removed the basic commentary schema definition and kept only the detailed one
    weather: {
        condition: String,
        temperature: Number
    },
    isLive: { type: Boolean, default: false },
    priority: { type: Number, default: 0 },
    innings: [schemas_1.InningsSchema],
    scorecard: {
        scorecard: [schemas_1.InningsSchema]
    },
    historicalScorecard: {
        scoreCard: [schemas_1.InningsSchema]
    },
    // Kept the detailed commentary schema definition
    commentary: {
        commentaryList: [mongoose_1.default.Schema.Types.Mixed],
        matchHeader: mongoose_1.default.Schema.Types.Mixed,
        lastUpdated: Date,
        liveText: String // Added this property to maintain compatibility
    },
    historicalCommentary: {
        commentaryList: [mongoose_1.default.Schema.Types.Mixed],
        matchHeader: mongoose_1.default.Schema.Types.Mixed,
        lastUpdated: Date
    },
    overs: {
        overs: [mongoose_1.default.Schema.Types.Mixed],
        matchHeader: mongoose_1.default.Schema.Types.Mixed,
        lastUpdated: Date
    },
    raw: mongoose_1.default.Schema.Types.Mixed
}, { timestamps: true });
exports.default = mongoose_1.default.model('Match', MatchSchema);
