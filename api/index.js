// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// CORS setup
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://crick-buddy-frontend-v.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// MongoDB connection
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
      if (mongoUri) {
        await mongoose.connect(mongoUri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        console.log('MongoDB connected for Vercel');
      }
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

// Match schema
const matchSchema = new mongoose.Schema({
  matchId: String,
  format: String,
  title: String,
  shortTitle: String,
  series: {
    id: String,
    name: String,
    seriesType: String
  },
  teams: [{
    teamId: String,
    teamName: String,
    teamShortName: String,
    score: {
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      overs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
      runRate: { type: Number, default: 0 }
    }
  }],
  status: String,
  venue: {
    name: String,
    city: String,
    country: String
  },
  startDate: Date,
  isLive: { type: Boolean, default: false },
  raw: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const Match = mongoose.models.Match || mongoose.model('Match', matchSchema);

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Cricket backend API is running on Vercel' });
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Vercel API' });
});

// Live matches endpoint
app.get('/api/matches/live', async (req, res) => {
  try {
    await connectDB();
    
    const liveMatches = await Match.find({
      $or: [
        { status: 'LIVE' },
        { status: 'Live' },
        { status: { $regex: 'live', $options: 'i' } },
        { isLive: true }
      ]
    })
    .sort({ startDate: -1 })
    .limit(10)
    .select('matchId title shortTitle teams venue series startDate format status isLive');
    
    res.json(liveMatches);
  } catch (error) {
    console.error('Live matches error:', error);
    res.status(500).json({ error: 'Failed to fetch live matches' });
  }
});

// Recent matches endpoint
app.get('/api/matches/recent', async (req, res) => {
  try {
    await connectDB();
    
    const { limit = 10 } = req.query;
    
    const recentMatches = await Match.find({
      $or: [
        { status: 'COMPLETED' },
        { status: 'Complete' },
        { status: { $regex: 'complete', $options: 'i' } },
        { status: { $regex: 'finished', $options: 'i' } }
      ]
    })
    .sort({ startDate: -1 })
    .limit(Number(limit))
    .select('matchId title shortTitle teams venue series startDate format status');
    
    res.json(recentMatches);
  } catch (error) {
    console.error('Recent matches error:', error);
    res.status(500).json({ error: 'Failed to fetch recent matches' });
  }
});

// Upcoming matches endpoint
app.get('/api/matches/upcoming', async (req, res) => {
  try {
    await connectDB();
    
    const { limit = 10 } = req.query;
    
    const upcomingMatches = await Match.find({
      $and: [
        {
          $or: [
            { status: 'UPCOMING' },
            { status: 'Upcoming' },
            { status: { $regex: 'upcoming', $options: 'i' } },
            { status: { $regex: 'scheduled', $options: 'i' } },
            {
              startDate: { $gte: new Date() },
              status: { $nin: ['COMPLETED', 'Complete', 'complete', 'Finished', 'finished', 'LIVE', 'Live', 'live'] }
            }
          ]
        },
        {
          status: { $nin: ['LIVE', 'Live', 'live', 'COMPLETED', 'Complete', 'complete', 'Finished', 'finished'] }
        }
      ]
    })
    .sort({ startDate: 1 })
    .limit(Number(limit))
    .select('matchId title shortTitle teams venue series startDate format status');
    
    res.json(upcomingMatches);
  } catch (error) {
    console.error('Upcoming matches error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming matches' });
  }
});

// Match by ID endpoint
app.get('/api/matches/:id', async (req, res) => {
  try {
    await connectDB();
    
    const { id } = req.params;
    const match = await Match.findOne({
      $or: [
        { matchId: id },
        { _id: id }
      ]
    });
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    
    res.json(match);
  } catch (error) {
    console.error('Match by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch match' });
  }
});

// All matches endpoint
app.get('/api/matches', async (req, res) => {
  try {
    await connectDB();
    
    const { format, limit = 20 } = req.query;
    
    let query = {};
    if (format) {
      query.format = { $regex: format, $options: 'i' };
    }
    
    const matches = await Match.find(query)
      .sort({ startDate: -1 })
      .limit(Number(limit))
      .select('matchId title shortTitle teams venue series startDate format status');
    
    res.json(matches);
  } catch (error) {
    console.error('All matches error:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;