// Simple Node.js entry point for Vercel
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();

// Load environment variables
require('dotenv').config();

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
        console.log('MongoDB connected');
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

// Basic routes
app.get('/', (req, res) => {
  res.json({ message: 'Cricket backend API is running on Vercel' });
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Vercel API' });
});

// Debug endpoint
app.get('/api/debug/env', (req, res) => {
  res.json({
    RAPIDAPI_KEY: process.env.RAPIDAPI_KEY ? 'SET ✅' : 'NOT SET ❌',
    RAPIDAPI_HOST: process.env.RAPIDAPI_HOST ? 'SET ✅' : 'NOT SET ❌',
    RAPIDAPI_MATCHES_UPCOMING_URL: process.env.RAPIDAPI_MATCHES_UPCOMING_URL ? 'SET ✅' : 'NOT SET ❌',
    RAPIDAPI_MATCHES_LIVE_URL: process.env.RAPIDAPI_MATCHES_LIVE_URL ? 'SET ✅' : 'NOT SET ❌',
    RAPIDAPI_MATCHES_RECENT_URL: process.env.RAPIDAPI_MATCHES_RECENT_URL ? 'SET ✅' : 'NOT SET ❌',
    MONGO_URI: process.env.MONGO_URI ? 'SET ✅' : 'NOT SET ❌',
    NODE_ENV: process.env.NODE_ENV || 'not set'
  });
});

// Upcoming matches endpoint
app.get('/api/matches/upcoming', async (req, res) => {
  try {
    await connectDB();

    const { limit = 10 } = req.query;

    console.log('🔍 Environment check:', {
      hasKey: !!process.env.RAPIDAPI_KEY,
      hasUrl: !!process.env.RAPIDAPI_MATCHES_UPCOMING_URL,
      hasHost: !!process.env.RAPIDAPI_HOST
    });

    // Try to fetch from RapidAPI
    if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_MATCHES_UPCOMING_URL) {
      try {
        console.log('✅ Fetching upcoming matches from RapidAPI...');
        const response = await axios.get(process.env.RAPIDAPI_MATCHES_UPCOMING_URL, {
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          },
          timeout: 10000
        });

        if (response.data && response.data.typeMatches) {
          const processedMatches = [];

          // Process all match types (International, Domestic, Women)
          for (const matchType of response.data.typeMatches) {
            if (matchType.seriesMatches) {
              for (const seriesMatch of matchType.seriesMatches) {
                if (seriesMatch.seriesAdWrapper && seriesMatch.seriesAdWrapper.matches) {
                  for (const match of seriesMatch.seriesAdWrapper.matches) {
                    if (match.matchInfo) {
                      const processedMatch = {
                        matchId: match.matchInfo.matchId?.toString(),
                        title: match.matchInfo.matchDesc || `${match.matchInfo.team1?.teamName} vs ${match.matchInfo.team2?.teamName}`,
                        shortTitle: match.matchInfo.shortDesc || match.matchInfo.matchDesc,
                        format: match.matchInfo.matchFormat || 'Unknown',
                        status: 'UPCOMING',
                        teams: [
                          {
                            teamId: match.matchInfo.team1?.teamId?.toString(),
                            teamName: match.matchInfo.team1?.teamName,
                            teamShortName: match.matchInfo.team1?.teamSName,
                            score: { runs: 0, wickets: 0, overs: 0, runRate: 0 }
                          },
                          {
                            teamId: match.matchInfo.team2?.teamId?.toString(),
                            teamName: match.matchInfo.team2?.teamName,
                            teamShortName: match.matchInfo.team2?.teamSName,
                            score: { runs: 0, wickets: 0, overs: 0, runRate: 0 }
                          }
                        ],
                        venue: {
                          name: match.matchInfo.venueInfo?.ground || 'TBD',
                          city: match.matchInfo.venueInfo?.city || '',
                          country: match.matchInfo.venueInfo?.country || ''
                        },
                        series: {
                          id: match.matchInfo.seriesId?.toString(),
                          name: match.matchInfo.seriesName || 'Unknown Series',
                          seriesType: 'INTERNATIONAL'
                        },
                        startDate: match.matchInfo.startDate ? new Date(parseInt(match.matchInfo.startDate)) : new Date()
                      };
                      processedMatches.push(processedMatch);
                    }
                  }
                }
              }
            }
          }

          console.log(`🎯 Processed ${processedMatches.length} upcoming matches from RapidAPI`);
          return res.json(processedMatches.slice(0, Number(limit)));
        } else {
          console.log('❌ No typeMatches found in RapidAPI response');
        }
      } catch (apiError) {
        console.error('RapidAPI upcoming matches error:', apiError.message);
      }
    } else {
      console.log('❌ Missing RapidAPI credentials for upcoming matches');
    }

    // Fallback to database
    console.log('Falling back to database for upcoming matches');
    const upcomingMatches = await Match.find({
      status: { $regex: 'upcoming', $options: 'i' }
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

// Match by ID endpoint (for match details page)
app.get('/api/matches/:id', async (req, res) => {
  try {
    await connectDB();

    const { id } = req.params;
    console.log(`🔍 Looking for match with ID: ${id}`);

    // First try to find in database
    let match = await Match.findOne({
      $or: [
        { matchId: id },
        { _id: id }
      ]
    });

    if (match) {
      console.log(`✅ Found match in database: ${match.title}`);
      return res.json(match);
    }

    // If not found in database, try to fetch from RapidAPI
    if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_MATCHES_INFO_URL) {
      try {
        console.log(`🌐 Fetching match ${id} from RapidAPI...`);
        const matchInfoUrl = `${process.env.RAPIDAPI_MATCHES_INFO_URL}/${id}`;
        const response = await axios.get(matchInfoUrl, {
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          },
          timeout: 10000
        });

        if (response.data && response.data.matchHeader) {
          const matchData = response.data.matchHeader;
          match = {
            matchId: id,
            title: matchData.matchDescription || `${matchData.team1?.teamName} vs ${matchData.team2?.teamName}`,
            shortTitle: matchData.shortDescription || matchData.matchDescription,
            format: matchData.matchFormat || 'Unknown',
            status: matchData.status || 'UPCOMING',
            teams: [
              {
                teamId: matchData.team1?.teamId?.toString(),
                teamName: matchData.team1?.teamName,
                teamShortName: matchData.team1?.teamSName,
                score: { runs: 0, wickets: 0, overs: 0, runRate: 0 }
              },
              {
                teamId: matchData.team2?.teamId?.toString(),
                teamName: matchData.team2?.teamName,
                teamShortName: matchData.team2?.teamSName,
                score: { runs: 0, wickets: 0, overs: 0, runRate: 0 }
              }
            ],
            venue: {
              name: matchData.venueInfo?.ground || 'TBD',
              city: matchData.venueInfo?.city || '',
              country: matchData.venueInfo?.country || ''
            },
            series: {
              id: matchData.seriesId?.toString(),
              name: matchData.seriesName || 'Unknown Series',
              seriesType: 'INTERNATIONAL'
            },
            startDate: matchData.startDate ? new Date(parseInt(matchData.startDate)) : new Date()
          };

          console.log(`✅ Found match from RapidAPI: ${match.title}`);
          return res.json(match);
        }
      } catch (apiError) {
        console.error('RapidAPI match info error:', apiError.message);
      }
    }

    // If still not found, try to find in upcoming/live/recent matches
    console.log(`🔍 Searching in all match collections for ID: ${id}`);

    // Check if it's an upcoming match we just fetched
    if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_MATCHES_UPCOMING_URL) {
      try {
        const response = await axios.get(process.env.RAPIDAPI_MATCHES_UPCOMING_URL, {
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          },
          timeout: 10000
        });

        if (response.data && response.data.typeMatches) {
          // Search through all upcoming matches
          for (const matchType of response.data.typeMatches) {
            if (matchType.seriesMatches) {
              for (const seriesMatch of matchType.seriesMatches) {
                if (seriesMatch.seriesAdWrapper && seriesMatch.seriesAdWrapper.matches) {
                  for (const m of seriesMatch.seriesAdWrapper.matches) {
                    if (m.matchInfo && m.matchInfo.matchId?.toString() === id) {
                      const foundMatch = {
                        matchId: id,
                        title: m.matchInfo.matchDesc || `${m.matchInfo.team1?.teamName} vs ${m.matchInfo.team2?.teamName}`,
                        shortTitle: m.matchInfo.shortDesc || m.matchInfo.matchDesc,
                        format: m.matchInfo.matchFormat || 'Unknown',
                        status: 'UPCOMING',
                        teams: [
                          {
                            teamId: m.matchInfo.team1?.teamId?.toString(),
                            teamName: m.matchInfo.team1?.teamName,
                            teamShortName: m.matchInfo.team1?.teamSName,
                            score: { runs: 0, wickets: 0, overs: 0, runRate: 0 }
                          },
                          {
                            teamId: m.matchInfo.team2?.teamId?.toString(),
                            teamName: m.matchInfo.team2?.teamName,
                            teamShortName: m.matchInfo.team2?.teamSName,
                            score: { runs: 0, wickets: 0, overs: 0, runRate: 0 }
                          }
                        ],
                        venue: {
                          name: m.matchInfo.venueInfo?.ground || 'TBD',
                          city: m.matchInfo.venueInfo?.city || '',
                          country: m.matchInfo.venueInfo?.country || ''
                        },
                        series: {
                          id: m.matchInfo.seriesId?.toString(),
                          name: m.matchInfo.seriesName || 'Unknown Series',
                          seriesType: 'INTERNATIONAL'
                        },
                        startDate: m.matchInfo.startDate ? new Date(parseInt(m.matchInfo.startDate)) : new Date()
                      };

                      console.log(`✅ Found match in upcoming matches: ${foundMatch.title}`);
                      return res.json(foundMatch);
                    }
                  }
                }
              }
            }
          }
        }
      } catch (apiError) {
        console.error('Error searching upcoming matches:', apiError.message);
      }
    }

    console.log(`❌ Match with ID ${id} not found anywhere`);
    return res.status(404).json({ message: 'Match not found' });

  } catch (error) {
    console.error('Match by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch match details' });
  }
});

// Live matches endpoint
app.get('/api/matches/live', async (req, res) => {
  try {
    await connectDB();

    // Try to fetch from RapidAPI first
    if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_MATCHES_LIVE_URL) {
      try {
        console.log('✅ Fetching live matches from RapidAPI...');
        const response = await axios.get(process.env.RAPIDAPI_MATCHES_LIVE_URL, {
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          },
          timeout: 10000
        });

        if (response.data && response.data.typeMatches) {
          const processedMatches = [];

          // Process all match types for live matches
          for (const matchType of response.data.typeMatches) {
            if (matchType.seriesMatches) {
              for (const seriesMatch of matchType.seriesMatches) {
                if (seriesMatch.seriesAdWrapper && seriesMatch.seriesAdWrapper.matches) {
                  for (const match of seriesMatch.seriesAdWrapper.matches) {
                    if (match.matchInfo) {
                      const processedMatch = {
                        matchId: match.matchInfo.matchId?.toString(),
                        title: match.matchInfo.matchDesc || `${match.matchInfo.team1?.teamName} vs ${match.matchInfo.team2?.teamName}`,
                        shortTitle: match.matchInfo.shortDesc || match.matchInfo.matchDesc,
                        format: match.matchInfo.matchFormat || 'Unknown',
                        status: 'LIVE',
                        isLive: true,
                        teams: [
                          {
                            teamId: match.matchInfo.team1?.teamId?.toString(),
                            teamName: match.matchInfo.team1?.teamName,
                            teamShortName: match.matchInfo.team1?.teamSName,
                            score: { runs: 0, wickets: 0, overs: 0, runRate: 0 }
                          },
                          {
                            teamId: match.matchInfo.team2?.teamId?.toString(),
                            teamName: match.matchInfo.team2?.teamName,
                            teamShortName: match.matchInfo.team2?.teamSName,
                            score: { runs: 0, wickets: 0, overs: 0, runRate: 0 }
                          }
                        ],
                        venue: {
                          name: match.matchInfo.venueInfo?.ground || 'TBD',
                          city: match.matchInfo.venueInfo?.city || '',
                          country: match.matchInfo.venueInfo?.country || ''
                        },
                        series: {
                          id: match.matchInfo.seriesId?.toString(),
                          name: match.matchInfo.seriesName || 'Unknown Series',
                          seriesType: 'INTERNATIONAL'
                        },
                        startDate: match.matchInfo.startDate ? new Date(parseInt(match.matchInfo.startDate)) : new Date()
                      };
                      processedMatches.push(processedMatch);
                    }
                  }
                }
              }
            }
          }

          console.log(`🎯 Processed ${processedMatches.length} live matches from RapidAPI`);
          return res.json(processedMatches);
        }
      } catch (apiError) {
        console.error('RapidAPI live matches error:', apiError.message);
      }
    }

    // Fallback to database
    const liveMatches = await Match.find({ status: { $regex: 'live', $options: 'i' } }).limit(10);
    res.json(liveMatches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch live matches' });
  }
});

// Recent matches endpoint
app.get('/api/matches/recent', async (req, res) => {
  try {
    await connectDB();

    const { limit = 10 } = req.query;

    // Try to fetch from RapidAPI first
    if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_MATCHES_RECENT_URL) {
      try {
        console.log('✅ Fetching recent matches from RapidAPI...');
        const response = await axios.get(process.env.RAPIDAPI_MATCHES_RECENT_URL, {
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          },
          timeout: 10000
        });

        if (response.data && response.data.typeMatches) {
          const processedMatches = [];

          // Process all match types for recent matches
          for (const matchType of response.data.typeMatches) {
            if (matchType.seriesMatches) {
              for (const seriesMatch of matchType.seriesMatches) {
                if (seriesMatch.seriesAdWrapper && seriesMatch.seriesAdWrapper.matches) {
                  for (const match of seriesMatch.seriesAdWrapper.matches) {
                    if (match.matchInfo) {
                      const processedMatch = {
                        matchId: match.matchInfo.matchId?.toString(),
                        title: match.matchInfo.matchDesc || `${match.matchInfo.team1?.teamName} vs ${match.matchInfo.team2?.teamName}`,
                        shortTitle: match.matchInfo.shortDesc || match.matchInfo.matchDesc,
                        format: match.matchInfo.matchFormat || 'Unknown',
                        status: 'COMPLETED',
                        teams: [
                          {
                            teamId: match.matchInfo.team1?.teamId?.toString(),
                            teamName: match.matchInfo.team1?.teamName,
                            teamShortName: match.matchInfo.team1?.teamSName,
                            score: { runs: 0, wickets: 0, overs: 0, runRate: 0 }
                          },
                          {
                            teamId: match.matchInfo.team2?.teamId?.toString(),
                            teamName: match.matchInfo.team2?.teamName,
                            teamShortName: match.matchInfo.team2?.teamSName,
                            score: { runs: 0, wickets: 0, overs: 0, runRate: 0 }
                          }
                        ],
                        venue: {
                          name: match.matchInfo.venueInfo?.ground || 'TBD',
                          city: match.matchInfo.venueInfo?.city || '',
                          country: match.matchInfo.venueInfo?.country || ''
                        },
                        series: {
                          id: match.matchInfo.seriesId?.toString(),
                          name: match.matchInfo.seriesName || 'Unknown Series',
                          seriesType: 'INTERNATIONAL'
                        },
                        startDate: match.matchInfo.startDate ? new Date(parseInt(match.matchInfo.startDate)) : new Date()
                      };
                      processedMatches.push(processedMatch);
                    }
                  }
                }
              }
            }
          }

          console.log(`🎯 Processed ${processedMatches.length} recent matches from RapidAPI`);
          return res.json(processedMatches.slice(0, Number(limit)));
        }
      } catch (apiError) {
        console.error('RapidAPI recent matches error:', apiError.message);
      }
    }

    // Fallback to database
    const recentMatches = await Match.find({ status: { $regex: 'complete', $options: 'i' } })
      .sort({ startDate: -1 })
      .limit(Number(limit));
    res.json(recentMatches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent matches' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;