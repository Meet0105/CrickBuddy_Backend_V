"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const db_1 = __importDefault(require("./config/db"));
const matches_1 = __importDefault(require("./routes/matches"));
const players_1 = __importDefault(require("./routes/players"));
const teams_1 = __importDefault(require("./routes/teams"));
const news_1 = __importDefault(require("./routes/news"));
const series_1 = __importDefault(require("./routes/series"));
const rankings_1 = __importDefault(require("./routes/rankings"));
const venues_1 = __importDefault(require("./routes/venues"));
const photos_1 = __importDefault(require("./routes/photos"));
const admin_1 = __importDefault(require("./routes/admin"));
// Load environment variables
dotenv_1.default.config({ path: __dirname + '/../.env' });
const app = (0, express_1.default)();
// ✅ Allowed origins
const allowedOrigins = [
    'http://localhost:3000', // local frontend
    'https://crick-buddy-frontend-v.vercel.app', // deployed frontend
    'https://crick-buddy-backend-v.vercel.app' // backend URL (for self-referencing)
];
// ✅ CORS options
const corsOptions = {
    origin: (origin, callback) => {
        // Allow all origins in development
        if (process.env.NODE_ENV === 'development') {
            callback(null, true);
        }
        else if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '2mb' }));
// Log environment variables for debugging
console.log('RAPIDAPI_KEY:', process.env.RAPIDAPI_KEY ? 'SET' : 'NOT SET');
console.log('RAPIDAPI_HOST:', process.env.RAPIDAPI_HOST ? 'SET' : 'NOT SET');
(0, db_1.default)();
app.get('/', (req, res) => {
    res.json({ message: 'Cricket backend (TypeScript) is running' });
});
app.use('/api/matches', matches_1.default);
app.use('/api/players', players_1.default);
app.use('/api/teams', teams_1.default);
app.use('/api/news', news_1.default);
app.use('/api/series', series_1.default);
app.use('/api/rankings', rankings_1.default);
app.use('/api/venues', venues_1.default);
app.use('/api/photos', photos_1.default);
app.use('/api/admin', admin_1.default);
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Internal server error', error: err === null || err === void 0 ? void 0 : err.message });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
});
