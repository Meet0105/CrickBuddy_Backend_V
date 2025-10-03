// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();

// Import environment variables
require('dotenv').config({ path: '../.env' });

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

    // First try to get from database
    let liveMatches = await Match.find({
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

    // If no live matches in database, try to fetch from RapidAPI
    if (liveMatches.length === 0 && process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_MATCHES_LIVE_URL) {
      try {
        console.log('Fetching live matches from RapidAPI...');
        const response = await axios.get(process.env.RAPIDAPI_MATCHES_LIVE_URL, {
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          },
          timeout: 10000
        });

        if (response.data && response.data.typeMatches) {
          const liveMatchesData = response.data.typeMatches.find(type =>
            type.matchType === 'Live Matches'
          );

          if (liveMatchesData && liveMatchesData.seriesMatches) {
            const processedMatches = [];

            for (const seriesMatch of liveMatchesData.seriesMatches) {
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

            liveMatches = processedMatches;
          }
        }
      } catch (apiError) {
        console.error('RapidAPI live matches error:', apiError.message);
      }
    }

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

    // First try to fetch from RapidAPI
    if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_MATCHES_RECENT_URL) {
      try {
        console.log('Fetching recent matches from RapidAPI...');
        const response = await axios.get(process.env.RAPIDAPI_MATCHES_RECENT_URL, {
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          },
          timeout: 10000
        });

        if (response.data && response.data.typeMatches) {
          const recentMatchesData = response.data.typeMatches.find(type =>
            type.matchType === 'Recent Matches'
          );

          if (recentMatchesData && recentMatchesData.seriesMatches) {
            const processedMatches = [];

            for (const seriesMatch of recentMatchesData.seriesMatches) {
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

            // Return the fresh API data (limited)
            return res.json(processedMatches.slice(0, Number(limit)));
          }
        }
      } catch (apiError) {
        console.error('RapidAPI recent matches error:', apiError.message);
      }
    }

    // Fallback to database if API fails
    console.log('Falling back to database for recent matches');
    let recentMatches = await Match.find({
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

    // If no recent matches in database, return empty array (API should provide data)
    // No manual fallback data needed since we're fetching from RapidAPI

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

    // First try to fetch from RapidAPI
    if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_MATCHES_UPCOMING_URL) {
      try {
        console.log('Fetching upcoming matches from RapidAPI...');
        const response = await axios.get(process.env.RAPIDAPI_MATCHES_UPCOMING_URL, {
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          },
          timeout: 10000
        });

        if (response.data && response.data.typeMatches) {
          const upcomingMatchesData = response.data.typeMatches.find(type =>
            type.matchType === 'Upcoming Matches'
          );

          if (upcomingMatchesData && upcomingMatchesData.seriesMatches) {
            const processedMatches = [];

            for (const seriesMatch of upcomingMatchesData.seriesMatches) {
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

            // Return the fresh API data (limited)
            return res.json(processedMatches.slice(0, Number(limit)));
          }
        }
      } catch (apiError) {
        console.error('RapidAPI upcoming matches error:', apiError.message);
      }
    }

    // Fallback to database if API fails
    console.log('Falling back to database for upcoming matches');
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

    // First try to find in database
    let match = await Match.findOne({
      $or: [
        { matchId: id },
        { _id: id }
      ]
    });

    // If not found in database, try to fetch from RapidAPI
    if (!match && process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_MATCHES_INFO_URL) {
      try {
        console.log(`Fetching match ${id} from RapidAPI...`);
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
        }
      } catch (apiError) {
        console.error('RapidAPI match info error:', apiError.message);
      }
    }

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

// Series endpoints
app.get('/api/series', async (req, res) => {
  try {
    // Try to fetch from RapidAPI series endpoint
    if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_SERIES_LIST_URL) {
      try {
        console.log('Fetching series from RapidAPI...');
        const response = await axios.get(process.env.RAPIDAPI_SERIES_LIST_URL, {
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          },
          timeout: 10000
        });

        if (response.data) {
          // Process the series data from RapidAPI
          let seriesList = [];

          if (response.data.seriesMapProto) {
            for (const seriesProto of response.data.seriesMapProto) {
              if (seriesProto.series) {
                seriesList.push(...seriesProto.series.map(series => {
                  // Determine proper status based on dates
                  let status = 'UPCOMING';
                  const now = new Date();
                  const startDate = series.startDt ? new Date(parseInt(series.startDt)) : null;
                  const endDate = series.endDt ? new Date(parseInt(series.endDt)) : null;

                  if (endDate && endDate < now) {
                    status = 'COMPLETED';
                  } else if (startDate && startDate <= now && (!endDate || endDate >= now)) {
                    status = 'LIVE';
                  }

                  return {
                    id: series.id?.toString(),
                    name: series.name,
                    seriesType: series.seriesType || 'INTERNATIONAL',
                    startDate: startDate,
                    endDate: endDate,
                    status: status
                  };
                }));
              }
            }
          } else if (response.data.series) {
            seriesList = response.data.series.map(series => {
              // Determine proper status based on dates
              let status = 'UPCOMING';
              const now = new Date();
              const startDate = series.startDt ? new Date(parseInt(series.startDt)) : null;
              const endDate = series.endDt ? new Date(parseInt(series.endDt)) : null;

              if (endDate && endDate < now) {
                status = 'COMPLETED';
              } else if (startDate && startDate <= now && (!endDate || endDate >= now)) {
                status = 'LIVE';
              }

              return {
                id: series.id?.toString(),
                name: series.name,
                seriesType: series.seriesType || 'INTERNATIONAL',
                startDate: startDate,
                endDate: endDate,
                status: status
              };
            });
          }

          return res.json(seriesList);
        }
      } catch (apiError) {
        console.error('RapidAPI series error:', apiError.message);
      }
    }

    // Fallback to sample data if API fails
    const fallbackSeries = [
      {
        id: 'aus-nz-2025',
        name: 'Australia vs New Zealand ODI Series 2025',
        seriesType: 'BILATERAL',
        startDate: new Date('2025-02-15'),
        endDate: new Date('2025-02-25'),
        status: 'UPCOMING'
      },
      {
        id: 'ind-eng-2025',
        name: 'India vs England T20I Series 2025',
        seriesType: 'BILATERAL',
        startDate: new Date('2025-02-18'),
        endDate: new Date('2025-02-28'),
        status: 'UPCOMING'
      }
    ];

    res.json(fallbackSeries);
  } catch (error) {
    console.error('Series error:', error);
    res.status(500).json({ error: 'Failed to fetch series' });
  }
});

app.get('/api/series/archives', async (req, res) => {
  try {
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch series archives' });
  }
});

// Teams endpoints
app.get('/api/teams', async (req, res) => {
  try {
    // Try to fetch from RapidAPI teams endpoint
    if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_TEAMS_LIST_URL) {
      try {
        console.log('Fetching teams from RapidAPI...');
        const response = await axios.get(process.env.RAPIDAPI_TEAMS_LIST_URL, {
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          },
          timeout: 10000
        });

        if (response.data && response.data.list) {
          const teamsList = response.data.list.map(team => ({
            teamId: team.teamId?.toString(),
            teamName: team.teamName,
            teamSName: team.teamSName,
            teamType: team.teamType || 'INTERNATIONAL',
            imageId: team.imageId,
            flagImage: team.imageId ? {
              url: `/api/photos/image/${team.imageId}`
            } : null
          }));

          return res.json(teamsList);
        }
      } catch (apiError) {
        console.error('RapidAPI teams error:', apiError.message);
      }
    }

    // Fallback teams data
    const fallbackTeams = [
      { teamId: '1', teamName: 'India', teamSName: 'IND', teamType: 'INTERNATIONAL' },
      { teamId: '2', teamName: 'Australia', teamSName: 'AUS', teamType: 'INTERNATIONAL' },
      { teamId: '3', teamName: 'England', teamSName: 'ENG', teamType: 'INTERNATIONAL' },
      { teamId: '4', teamName: 'South Africa', teamSName: 'SA', teamType: 'INTERNATIONAL' },
      { teamId: '5', teamName: 'New Zealand', teamSName: 'NZ', teamType: 'INTERNATIONAL' },
      { teamId: '6', teamName: 'Sri Lanka', teamSName: 'SL', teamType: 'INTERNATIONAL' },
      { teamId: '7', teamName: 'Pakistan', teamSName: 'PAK', teamType: 'INTERNATIONAL' },
      { teamId: '8', teamName: 'West Indies', teamSName: 'WI', teamType: 'INTERNATIONAL' },
      { teamId: '9', teamName: 'Bangladesh', teamSName: 'BAN', teamType: 'INTERNATIONAL' },
      { teamId: '10', teamName: 'Afghanistan', teamSName: 'AFG', teamType: 'INTERNATIONAL' }
    ];

    res.json(fallbackTeams);
  } catch (error) {
    console.error('Teams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Team by ID endpoint
app.get('/api/teams/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try to fetch team details from RapidAPI
    if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_TEAMS_LIST_URL) {
      try {
        console.log(`Fetching team ${id} details from RapidAPI...`);
        const response = await axios.get(process.env.RAPIDAPI_TEAMS_LIST_URL, {
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          },
          timeout: 10000
        });

        if (response.data && response.data.list) {
          const team = response.data.list.find(t => t.teamId?.toString() === id);
          if (team) {
            const teamDetails = {
              teamId: team.teamId?.toString(),
              teamName: team.teamName,
              teamSName: team.teamSName,
              teamType: team.teamType || 'INTERNATIONAL',
              imageId: team.imageId,
              flagImage: team.imageId ? {
                url: `/api/photos/image/${team.imageId}`
              } : null
            };
            return res.json(teamDetails);
          }
        }
      } catch (apiError) {
        console.error('RapidAPI team details error:', apiError.message);
      }
    }

    // Fallback team data
    const fallbackTeams = {
      '1': { teamId: '1', teamName: 'India', teamSName: 'IND', teamType: 'INTERNATIONAL' },
      '2': { teamId: '2', teamName: 'Australia', teamSName: 'AUS', teamType: 'INTERNATIONAL' },
      '3': { teamId: '3', teamName: 'England', teamSName: 'ENG', teamType: 'INTERNATIONAL' }
    };

    const team = fallbackTeams[id];
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json(team);
  } catch (error) {
    console.error('Team details error:', error);
    res.status(500).json({ error: 'Failed to fetch team details' });
  }
});

// News endpoints
app.get('/api/news', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Try to fetch from RapidAPI news endpoint
    if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_NEWS_LIST_URL) {
      try {
        console.log('Fetching news from RapidAPI...');
        const response = await axios.get(process.env.RAPIDAPI_NEWS_LIST_URL, {
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          },
          timeout: 10000
        });

        if (response.data && response.data.storyList) {
          const newsList = response.data.storyList.slice(0, Number(limit)).map(story => {
            const storyData = story.story || story;
            return {
              id: storyData.id?.toString(),
              headline: storyData.hline || 'Cricket News',
              intro: storyData.intro || '',
              publishTime: storyData.pubTime ? new Date(parseInt(storyData.pubTime)).toISOString() : new Date().toISOString(),
              source: storyData.source || 'Cricbuzz',
              imageId: storyData.imageId,
              content: storyData.content || storyData.intro || 'Full article content...'
            };
          });

          return res.json(newsList);
        }
      } catch (apiError) {
        console.error('RapidAPI news error:', apiError.message);
      }
    }

    // Fallback news data
    const fallbackNews = [
      {
        id: '1',
        headline: 'Cricket Match Updates',
        intro: 'Latest updates from the cricket world...',
        publishTime: new Date().toISOString(),
        source: 'Cricket News',
        imageId: 'news1'
      }
    ];

    res.json(fallbackNews);
  } catch (error) {
    console.error('News error:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

app.get('/api/news/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try to fetch news detail from RapidAPI
    if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_NEWS_DETAIL_URL) {
      try {
        console.log(`Fetching news ${id} from RapidAPI...`);
        const newsDetailUrl = `${process.env.RAPIDAPI_NEWS_DETAIL_URL}/${id}`;
        const response = await axios.get(newsDetailUrl, {
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          },
          timeout: 10000
        });

        if (response.data) {
          const newsData = response.data;
          const newsItem = {
            id: id,
            headline: newsData.headline || newsData.hline || 'Cricket News',
            intro: newsData.intro || '',
            content: newsData.content || newsData.intro || 'Full article content...',
            publishTime: newsData.pubTime ? new Date(parseInt(newsData.pubTime)).toISOString() : new Date().toISOString(),
            source: newsData.source || 'Cricbuzz',
            imageId: newsData.imageId
          };

          return res.json(newsItem);
        }
      } catch (apiError) {
        console.error('RapidAPI news detail error:', apiError.message);
      }
    }

    // Fallback news item
    const newsItem = {
      id,
      headline: 'Cricket Match Preview',
      intro: 'Detailed analysis of the upcoming cricket match...',
      content: 'Full article content would go here. This is a detailed cricket news article with comprehensive coverage of the match, players, and analysis.',
      publishTime: new Date().toISOString(),
      source: 'Cricket News',
      imageId: 'news1'
    };

    res.json(newsItem);
  } catch (error) {
    console.error('News detail error:', error);
    res.status(500).json({ error: 'Failed to fetch news detail' });
  }
});

app.get('/api/news/categories', async (req, res) => {
  try {
    const categories = [
      { id: '1', name: 'Match Reports' },
      { id: '2', name: 'Features' },
      { id: '3', name: 'Latest News' }
    ];
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Players endpoints
app.get('/api/players/search', async (req, res) => {
  try {
    const { plrN } = req.query;

    // Try to fetch from RapidAPI players search endpoint
    if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_PLAYERS_SEARCH_BASE_URL && plrN) {
      try {
        console.log('Searching players from RapidAPI...');
        const searchUrl = `${process.env.RAPIDAPI_PLAYERS_SEARCH_BASE_URL}${encodeURIComponent(plrN)}`;
        const response = await axios.get(searchUrl, {
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          },
          timeout: 10000
        });

        if (response.data && response.data.player) {
          const playersList = response.data.player.map(player => ({
            id: player.id?.toString(),
            name: player.name,
            teamName: player.teamName,
            role: player.role,
            imageId: player.imageId
          }));

          return res.json(playersList);
        }
      } catch (apiError) {
        console.error('RapidAPI players search error:', apiError.message);
      }
    }

    // Fallback players data
    const fallbackPlayers = [
      { id: '1', name: 'Virat Kohli', teamName: 'India', role: 'Batsman' },
      { id: '2', name: 'Steve Smith', teamName: 'Australia', role: 'Batsman' },
      { id: '3', name: 'Joe Root', teamName: 'England', role: 'Batsman' }
    ];

    const filteredPlayers = plrN ?
      fallbackPlayers.filter(p => p.name.toLowerCase().includes(plrN.toLowerCase())) :
      fallbackPlayers;

    res.json(filteredPlayers);
  } catch (error) {
    console.error('Players search error:', error);
    res.status(500).json({ error: 'Failed to search players' });
  }
});

app.get('/api/players/trending', async (req, res) => {
  try {
    const players = [
      {
        id: '1',
        name: 'Virat Kohli',
        teamName: 'India',
        role: 'Batsman',
        stats: { runs: 12000, average: 50.5 }
      },
      {
        id: '2',
        name: 'Steve Smith',
        teamName: 'Australia',
        role: 'Batsman',
        stats: { runs: 8500, average: 61.8 }
      }
    ];

    res.json(players);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trending players' });
  }
});

// Venues endpoints
app.get('/api/venues/:id/info', async (req, res) => {
  try {
    const { id } = req.params;

    const venue = {
      id,
      name: 'Melbourne Cricket Ground',
      city: 'Melbourne',
      country: 'Australia',
      capacity: 100024,
      established: 1853
    };

    res.json(venue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch venue info' });
  }
});

app.get('/api/venues/:id/matches', async (req, res) => {
  try {
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch venue matches' });
  }
});

// Rankings endpoints
app.get('/api/rankings/*', async (req, res) => {
  try {
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
});

// Photos endpoints
app.get('/api/photos/image/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try to fetch image from RapidAPI
    if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_IMAGE_URL) {
      try {
        const imageUrl = `${process.env.RAPIDAPI_IMAGE_URL}/${id}`;
        const response = await axios.get(imageUrl, {
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          },
          timeout: 10000,
          responseType: 'stream'
        });

        // Forward the image
        response.data.pipe(res);
        return;
      } catch (apiError) {
        console.error('RapidAPI image error:', apiError.message);
      }
    }

    // Fallback: return placeholder image URL or 404
    res.status(404).json({ error: 'Image not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

app.get('/api/photos/*', async (req, res) => {
  try {
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// Admin endpoints
app.get('/api/admin/*', async (req, res) => {
  try {
    res.json({ message: 'Admin endpoint' });
  } catch (error) {
    res.status(500).json({ error: 'Admin error' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;