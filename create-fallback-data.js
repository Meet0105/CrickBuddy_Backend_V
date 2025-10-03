// Create fallback data for when API is unavailable
const mongoose = require('mongoose');
require('dotenv').config();

const createFallbackData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cricbuzz_ts');
    console.log('📊 Connected to database');

    // Define schema
    const MatchSchema = new mongoose.Schema({
      matchId: { type: String, required: true, unique: true },
      title: { type: String, required: true },
      status: {
        type: String,
        enum: ['UPCOMING', 'LIVE', 'COMPLETED', 'ABANDONED', 'CANCELLED'],
        default: 'UPCOMING'
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
          runRate: { type: Number, default: 0 },
          requiredRunRate: { type: Number, default: 0 }
        },
        isWinner: { type: Boolean, default: false }
      }],
      venue: {
        name: { type: String, required: true },
        city: String,
        country: String
      },
      startDate: { type: Date, required: true },
      series: {
        id: { type: String, required: true },
        name: { type: String, required: true },
        seriesType: {
          type: String,
          enum: ['INTERNATIONAL', 'DOMESTIC', 'LEAGUE', 'WOMEN'],
          default: 'DOMESTIC'
        }
      },
      isLive: { type: Boolean, default: false },
      format: String,
      raw: mongoose.Schema.Types.Mixed
    }, { timestamps: true });

    const Match = mongoose.model('Match', MatchSchema, 'matches');

    // Create the India vs West Indies match with correct scores
    const fallbackMatch = {
      matchId: '117359',
      title: 'India vs West Indies - 1st Test',
      status: 'LIVE',
      isLive: true,
      format: 'TEST',
      startDate: new Date('2025-10-02T13:23:44.670Z'),
      venue: {
        name: 'Narendra Modi Stadium',
        city: 'Ahmedabad',
        country: 'India'
      },
      series: {
        id: '9629',
        name: 'West Indies tour of India, 2025',
        seriesType: 'INTERNATIONAL'
      },
      teams: [
        {
          teamId: '2',
          teamName: 'India',
          teamShortName: 'IND',
          score: {
            runs: 121,
            wickets: 2,
            overs: 38,
            balls: 228,
            runRate: 3.18,
            requiredRunRate: 0
          },
          isWinner: false
        },
        {
          teamId: '10',
          teamName: 'West Indies',
          teamShortName: 'WI',
          score: {
            runs: 162,
            wickets: 10,
            overs: 44.1,
            balls: 265,
            runRate: 3.67,
            requiredRunRate: 0
          },
          isWinner: false
        }
      ],
      raw: {
        note: 'Fallback data created when API quota exceeded',
        createdAt: new Date().toISOString()
      }
    };

    console.log('💾 Creating fallback match data...');
    
    // Delete existing match if it exists
    await Match.deleteOne({ matchId: '117359' });
    
    // Create new match with correct data
    const savedMatch = await Match.create(fallbackMatch);
    
    console.log('✅ Fallback match created successfully!');
    console.log('Match ID:', savedMatch.matchId);
    console.log('Title:', savedMatch.title);
    console.log('Teams:');
    savedMatch.teams.forEach((team, index) => {
      console.log(`  Team ${index + 1}: ${team.teamName} - ${team.score.runs}/${team.score.wickets}`);
    });

    // Create a few more sample matches for testing
    const sampleMatches = [
      {
        matchId: 'SAMPLE_001',
        title: 'Australia vs New Zealand - T20I',
        status: 'COMPLETED',
        isLive: false,
        format: 'T20',
        startDate: new Date('2025-10-01T10:00:00.000Z'),
        venue: {
          name: 'Melbourne Cricket Ground',
          city: 'Melbourne',
          country: 'Australia'
        },
        series: {
          id: 'AUS_NZ_2025',
          name: 'Australia vs New Zealand T20I Series',
          seriesType: 'INTERNATIONAL'
        },
        teams: [
          {
            teamId: '4',
            teamName: 'Australia',
            teamShortName: 'AUS',
            score: { runs: 185, wickets: 6, overs: 20, balls: 120, runRate: 9.25, requiredRunRate: 0 },
            isWinner: true
          },
          {
            teamId: '13',
            teamName: 'New Zealand',
            teamShortName: 'NZ',
            score: { runs: 172, wickets: 8, overs: 20, balls: 120, runRate: 8.60, requiredRunRate: 0 },
            isWinner: false
          }
        ]
      },
      {
        matchId: 'SAMPLE_002',
        title: 'England vs South Africa - ODI',
        status: 'UPCOMING',
        isLive: false,
        format: 'ODI',
        startDate: new Date('2025-10-03T14:00:00.000Z'),
        venue: {
          name: 'Lords Cricket Ground',
          city: 'London',
          country: 'England'
        },
        series: {
          id: 'ENG_SA_2025',
          name: 'England vs South Africa ODI Series',
          seriesType: 'INTERNATIONAL'
        },
        teams: [
          {
            teamId: '1',
            teamName: 'England',
            teamShortName: 'ENG',
            score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0, requiredRunRate: 0 },
            isWinner: false
          },
          {
            teamId: '3',
            teamName: 'South Africa',
            teamShortName: 'SA',
            score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0, requiredRunRate: 0 },
            isWinner: false
          }
        ]
      }
    ];

    console.log('\\n💾 Creating sample matches...');
    for (const sampleMatch of sampleMatches) {
      await Match.deleteOne({ matchId: sampleMatch.matchId });
      await Match.create(sampleMatch);
      console.log(`✅ Created: ${sampleMatch.title}`);
    }

    console.log('\\n🎉 All fallback data created successfully!');
    console.log('\\n📋 Summary:');
    console.log('- 1 Live match: India vs West Indies (correct scores)');
    console.log('- 1 Completed match: Australia vs New Zealand');
    console.log('- 1 Upcoming match: England vs South Africa');
    console.log('\\n🌐 Frontend should now display matches even without API access!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Disconnected from database');
  }
};

createFallbackData();