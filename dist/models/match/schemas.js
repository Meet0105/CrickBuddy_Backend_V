"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InningsSchema = exports.ExtrasSchema = exports.BowlerSchema = exports.BatsmanSchema = exports.DeliverySchema = exports.TeamScoreSchema = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
exports.TeamScoreSchema = new mongoose_1.default.Schema({
    teamId: { type: String, required: true },
    teamName: { type: String, required: true },
    teamShortName: { type: String, required: true },
    score: {
        runs: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        overs: { type: Number, default: 0 },
        balls: Number,
        runRate: Number,
        requiredRunRate: Number
    },
    isWinner: { type: Boolean, default: false }
}, { _id: false });
exports.DeliverySchema = new mongoose_1.default.Schema({
    over: Number,
    ballInOver: Number,
    batsman: String,
    bowler: String,
    nonStriker: String,
    runs: {
        batsman: Number,
        extras: Number,
        total: Number
    },
    wicket: {
        isWicket: { type: Boolean, default: false },
        description: String
    },
    event: String
}, { _id: false });
exports.BatsmanSchema = new mongoose_1.default.Schema({
    batId: String,
    batName: String,
    name: String,
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    strikeRate: Number,
    strkrate: Number,
    outDesc: String,
    outdesc: String,
    isCaptain: mongoose_1.default.Schema.Types.Mixed,
    iscaptain: Boolean,
    isKeeper: mongoose_1.default.Schema.Types.Mixed,
    iskeeper: Boolean
}, { _id: false });
exports.BowlerSchema = new mongoose_1.default.Schema({
    bowlerId: String,
    bowlerName: String,
    name: String,
    overs: { type: Number, default: 0 },
    maidens: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    economy: Number,
    isCaptain: mongoose_1.default.Schema.Types.Mixed,
    iscaptain: Boolean
}, { _id: false });
exports.ExtrasSchema = new mongoose_1.default.Schema({
    total: { type: Number, default: 0 },
    byes: { type: Number, default: 0 },
    legbyes: { type: Number, default: 0 },
    wides: { type: Number, default: 0 },
    noballs: { type: Number, default: 0 },
    penalty: { type: Number, default: 0 }
}, { _id: false });
exports.InningsSchema = new mongoose_1.default.Schema({
    inningsId: String,
    inningsid: String,
    batTeam: String,
    batteam: String,
    bowlTeam: String,
    bowlteam: String,
    totalRuns: Number,
    total: Number,
    totalWickets: Number,
    wickets: Number,
    totalOvers: Number,
    overs: Number,
    batsmen: [exports.BatsmanSchema],
    batsman: [exports.BatsmanSchema],
    bowlers: [exports.BowlerSchema],
    bowler: [exports.BowlerSchema],
    extras: exports.ExtrasSchema,
    fallOfWickets: String,
    deliveries: [exports.DeliverySchema],
    batTeamDetails: {
        batTeamId: String,
        batTeamName: String,
        batsmenData: mongoose_1.default.Schema.Types.Mixed
    },
    bowlTeamDetails: {
        bowlTeamId: String,
        bowlTeamName: String,
        bowlersData: mongoose_1.default.Schema.Types.Mixed
    }
}, { _id: false });
