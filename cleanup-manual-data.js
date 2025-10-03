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

async function cleanupManualData() {
  try {
    console.log('🧹 Cleaning up manually created match data...');
    
    // List of manually created match IDs that we added
    const manualMatchIds = [
      '135173', '134865', '133880', '133875', '133897', 
      '134480', '134491', '134485', '121455', '134881'
    ];
    
    console.log('📋 Checking for manually created matches...');
    const manualMatches = await Match.find({ 
      matchId: { $in: manualMatchIds } 
    });
    
    console.log(`Found ${manualMatches.length} manually created matches:`);
    manualMatches.forEach(match => {
      console.log(`  - ${match.matchId}: ${match.title}`);
    });
    
    if (manualMatches.length > 0) {
      console.log('\n🗑️ Removing manually created matches...');
      const result = await Match.deleteMany({ 
        matchId: { $in: manualMatchIds } 
      });
      
      console.log(`✅ Deleted ${result.deletedCount} manually created matches`);
      console.log('💡 Now the API will fetch fresh data from RapidAPI instead of using manual data');
    } else {
      console.log('✅ No manually created matches found to clean up');
    }
    
    // Check remaining matches
    const remainingMatches = await Match.countDocuments();
    console.log(`\n📊 Remaining matches in database: ${remainingMatches}`);
    
    console.log('\n🎉 Cleanup completed! The API will now fetch fresh data from RapidAPI.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the cleanup
cleanupManualData();