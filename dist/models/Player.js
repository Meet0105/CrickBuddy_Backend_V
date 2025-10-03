"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const StatsSchema = new mongoose_1.default.Schema({
    matches: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 }
}, { _id: false });
const PlayerSchema = new mongoose_1.default.Schema({
    playerId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: String,
    country: String,
    stats: {
        T20: StatsSchema,
        ODI: StatsSchema,
        Test: StatsSchema,
        All: StatsSchema
    },
    raw: mongoose_1.default.Schema.Types.Mixed
}, { timestamps: true });
exports.default = mongoose_1.default.model('Player', PlayerSchema);
