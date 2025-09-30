"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const PhotoSchema = new mongoose_1.default.Schema({
    photoId: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    caption: String,
    credit: String,
    width: Number,
    height: Number,
    format: String,
    size: Number,
    tags: [String],
    relatedNews: [String],
    relatedMatches: [String],
    relatedPlayers: [String],
    relatedTeams: [String],
    uploadedDate: { type: Date, default: Date.now },
    lastAccessed: { type: Date, default: Date.now },
    raw: mongoose_1.default.Schema.Types.Mixed
}, { timestamps: true });
// Indexes for better performance
PhotoSchema.index({ tags: 1 });
PhotoSchema.index({ relatedNews: 1 });
PhotoSchema.index({ relatedMatches: 1 });
PhotoSchema.index({ relatedPlayers: 1 });
PhotoSchema.index({ relatedTeams: 1 });
PhotoSchema.index({ uploadedDate: -1 });
exports.default = mongoose_1.default.model('Photo', PhotoSchema);
