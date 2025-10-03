const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB - use the same database as the server
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/cricket-app';
console.log('Connecting to:', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials in log

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Match schema (simplified version)
const matchSchema = new mongoose.Schema({
  matchId: { type: String, required: true, unique: true },
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

const Match = mongoose.model('Match', matchSchema);

// Real upcoming cricket matches data
const upcomingMatches = [
  {
    matchId: '135173',
    format: 'ODI',
    title: 'Australia vs New Zealand, 1st ODI',
    shortTitle: 'AUS vs NZ',
    series: {
      id: 'aus-nz-2025',
      name: 'Australia vs New Zealand ODI Series 2025',
      seriesType: 'BILATERAL'
    },
    teams: [
      {
        teamId: '2',
        teamName: 'Australia',
        teamShortName: 'AUS',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      },
      {
        teamId: '5',
        teamName: 'New Zealand',
        teamShortName: 'NZ',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      }
    ],
    status: 'UPCOMING',
    venue: {
      name: 'Melbourne Cricket Ground',
      city: 'Melbourne',
      country: 'Australia'
    },
    startDate: new Date('2025-02-15T04:30:00Z'),
    isLive: false
  },
  {
    matchId: '134865',
    format: 'T20',
    title: 'India vs England, 1st T20I',
    shortTitle: 'IND vs ENG',
    series: {
      id: 'ind-eng-2025',
      name: 'India vs England T20I Series 2025',
      seriesType: 'BILATERAL'
    },
    teams: [
      {
        teamId: '1',
        teamName: 'India',
        teamShortName: 'IND',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      },
      {
        teamId: '3',
        teamName: 'England',
        teamShortName: 'ENG',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      }
    ],
    status: 'UPCOMING',
    venue: {
      name: 'Eden Gardens',
      city: 'Kolkata',
      country: 'India'
    },
    startDate: new Date('2025-02-18T14:00:00Z'),
    isLive: false
  },
  {
    matchId: '133880',
    format: 'TEST',
    title: 'South Africa vs Pakistan, 1st Test',
    shortTitle: 'SA vs PAK',
    series: {
      id: 'sa-pak-2025',
      name: 'South Africa vs Pakistan Test Series 2025',
      seriesType: 'BILATERAL'
    },
    teams: [
      {
        teamId: '4',
        teamName: 'South Africa',
        teamShortName: 'SA',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      },
      {
        teamId: '7',
        teamName: 'Pakistan',
        teamShortName: 'PAK',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      }
    ],
    status: 'UPCOMING',
    venue: {
      name: 'Newlands',
      city: 'Cape Town',
      country: 'South Africa'
    },
    startDate: new Date('2025-02-20T08:00:00Z'),
    isLive: false
  },
  {
    matchId: '133875',
    format: 'TEST',
    title: 'West Indies vs Sri Lanka, 1st Test',
    shortTitle: 'WI vs SL',
    series: {
      id: 'wi-sl-2025',
      name: 'West Indies vs Sri Lanka Test Series 2025',
      seriesType: 'BILATERAL'
    },
    teams: [
      {
        teamId: '8',
        teamName: 'West Indies',
        teamShortName: 'WI',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      },
      {
        teamId: '6',
        teamName: 'Sri Lanka',
        teamShortName: 'SL',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      }
    ],
    status: 'UPCOMING',
    venue: {
      name: 'Kensington Oval',
      city: 'Bridgetown',
      country: 'Barbados'
    },
    startDate: new Date('2025-02-22T14:30:00Z'),
    isLive: false
  },
  {
    matchId: '133897',
    format: 'TEST',
    title: 'Bangladesh vs Afghanistan, 1st Test',
    shortTitle: 'BAN vs AFG',
    series: {
      id: 'ban-afg-2025',
      name: 'Bangladesh vs Afghanistan Test Series 2025',
      seriesType: 'BILATERAL'
    },
    teams: [
      {
        teamId: '9',
        teamName: 'Bangladesh',
        teamShortName: 'BAN',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      },
      {
        teamId: '10',
        teamName: 'Afghanistan',
        teamShortName: 'AFG',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      }
    ],
    status: 'UPCOMING',
    venue: {
      name: 'Shere Bangla National Stadium',
      city: 'Dhaka',
      country: 'Bangladesh'
    },
    startDate: new Date('2025-02-25T04:00:00Z'),
    isLive: false
  },
  {
    matchId: '134480',
    format: 'TEST',
    title: 'England vs Australia, 1st Test',
    shortTitle: 'ENG vs AUS',
    series: {
      id: 'eng-aus-2025',
      name: 'The Ashes 2025',
      seriesType: 'BILATERAL'
    },
    teams: [
      {
        teamId: '3',
        teamName: 'England',
        teamShortName: 'ENG',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      },
      {
        teamId: '2',
        teamName: 'Australia',
        teamShortName: 'AUS',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      }
    ],
    status: 'UPCOMING',
    venue: {
      name: 'Lords Cricket Ground',
      city: 'London',
      country: 'England'
    },
    startDate: new Date('2025-03-01T11:00:00Z'),
    isLive: false
  },
  {
    matchId: '134491',
    format: 'TEST',
    title: 'India vs South Africa, 1st Test',
    shortTitle: 'IND vs SA',
    series: {
      id: 'ind-sa-2025',
      name: 'India vs South Africa Test Series 2025',
      seriesType: 'BILATERAL'
    },
    teams: [
      {
        teamId: '1',
        teamName: 'India',
        teamShortName: 'IND',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      },
      {
        teamId: '4',
        teamName: 'South Africa',
        teamShortName: 'SA',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      }
    ],
    status: 'UPCOMING',
    venue: {
      name: 'M. Chinnaswamy Stadium',
      city: 'Bangalore',
      country: 'India'
    },
    startDate: new Date('2025-03-05T04:30:00Z'),
    isLive: false
  },
  {
    matchId: '134485',
    format: 'TEST',
    title: 'Pakistan vs New Zealand, 1st Test',
    shortTitle: 'PAK vs NZ',
    series: {
      id: 'pak-nz-2025',
      name: 'Pakistan vs New Zealand Test Series 2025',
      seriesType: 'BILATERAL'
    },
    teams: [
      {
        teamId: '7',
        teamName: 'Pakistan',
        teamShortName: 'PAK',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      },
      {
        teamId: '5',
        teamName: 'New Zealand',
        teamShortName: 'NZ',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      }
    ],
    status: 'UPCOMING',
    venue: {
      name: 'National Stadium',
      city: 'Karachi',
      country: 'Pakistan'
    },
    startDate: new Date('2025-03-08T05:00:00Z'),
    isLive: false
  },
  {
    matchId: '121455',
    format: 'ODI',
    title: 'Sri Lanka vs West Indies, 1st ODI',
    shortTitle: 'SL vs WI',
    series: {
      id: 'sl-wi-2025',
      name: 'Sri Lanka vs West Indies ODI Series 2025',
      seriesType: 'BILATERAL'
    },
    teams: [
      {
        teamId: '6',
        teamName: 'Sri Lanka',
        teamShortName: 'SL',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      },
      {
        teamId: '8',
        teamName: 'West Indies',
        teamShortName: 'WI',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      }
    ],
    status: 'UPCOMING',
    venue: {
      name: 'R.Premadasa Stadium',
      city: 'Colombo',
      country: 'Sri Lanka'
    },
    startDate: new Date('2025-03-12T09:30:00Z'),
    isLive: false
  },
  {
    matchId: '134881',
    format: 'T20',
    title: 'Afghanistan vs Bangladesh, 1st T20I',
    shortTitle: 'AFG vs BAN',
    series: {
      id: 'afg-ban-2025',
      name: 'Afghanistan vs Bangladesh T20I Series 2025',
      seriesType: 'BILATERAL'
    },
    teams: [
      {
        teamId: '10',
        teamName: 'Afghanistan',
        teamShortName: 'AFG',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      },
      {
        teamId: '9',
        teamName: 'Bangladesh',
        teamShortName: 'BAN',
        score: { runs: 0, wickets: 0, overs: 0, balls: 0, runRate: 0 }
      }
    ],
    status: 'UPCOMING',
    venue: {
      name: 'Sharjah Cricket Stadium',
      city: 'Sharjah',
      country: 'UAE'
    },
    startDate: new Date('2025-03-15T14:30:00Z'),
    isLive: false
  }
];

async function createUpcomingMatches() {
  try {
    console.log('🏏 Creating upcoming matches with real team names...');
    
    // Delete existing upcoming matches to avoid duplicates
    await Match.deleteMany({ status: 'UPCOMING' });
    console.log('✅ Cleared existing upcoming matches');
    
    // Insert new upcoming matches
    const results = await Match.insertMany(upcomingMatches);
    console.log(`✅ Created ${results.length} upcoming matches with real team names`);
    
    // Display created matches
    console.log('\n📅 Created upcoming matches:');
    results.forEach((match, index) => {
      console.log(`${index + 1}. ${match.title}`);
      console.log(`   Teams: ${match.teams[0].teamName} vs ${match.teams[1].teamName}`);
      console.log(`   Format: ${match.format}`);
      console.log(`   Venue: ${match.venue.name}, ${match.venue.city}`);
      console.log(`   Date: ${match.startDate.toLocaleDateString()}`);
      console.log('');
    });
    
    console.log('🎉 All upcoming matches created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating upcoming matches:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
createUpcomingMatches();