"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const NewsSchema = new mongoose_1.default.Schema({
    newsId: { type: String, required: true, unique: true },
    headline: { type: String, required: true },
    subHeadline: String,
    content: { type: String, required: true },
    summary: { type: String, required: true },
    author: {
        name: { type: String, required: true },
        image: String
    },
    publishedDate: { type: Date, required: true },
    lastModified: { type: Date, default: Date.now },
    category: {
        type: String,
        enum: ['MATCH_REPORT', 'BREAKING_NEWS', 'INTERVIEW', 'ANALYSIS', 'OPINION', 'STATS', 'OTHER'],
        default: 'OTHER'
    },
    tags: [String],
    relatedMatches: [String],
    relatedPlayers: [String],
    relatedTeams: [String],
    featuredImage: {
        url: String,
        caption: String,
        credit: String
    },
    isBreaking: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    priority: { type: Number, default: 0 },
    readTime: { type: Number, default: 5 },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    seoMeta: {
        metaTitle: String,
        metaDescription: String,
        keywords: [String]
    }
}, { timestamps: true });
// Indexes for better performance
NewsSchema.index({ category: 1, publishedDate: -1 });
NewsSchema.index({ isBreaking: 1, priority: -1 });
NewsSchema.index({ isFeatured: 1, publishedDate: -1 });
NewsSchema.index({ tags: 1 });
exports.default = mongoose_1.default.model('News', NewsSchema);
