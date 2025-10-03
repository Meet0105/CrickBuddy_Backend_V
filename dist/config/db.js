"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cricbuzz_ts';
    try {
        await mongoose_1.default.connect(uri, {});
        console.log('✅ MongoDB Connected');
    }
    catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
};
exports.default = connectDB;
