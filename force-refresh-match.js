// Force refresh match by deleting it first
const mongoose = require('mongoose');
const http = require('http');
require('dotenv').config();

const forceRefreshMatch = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cricbuzz_ts');
    console.log('📊 Connected to database');

    // Define schema
    const MatchSchema = new mongoose.Schema({
      matchId: String
    }, { timestamps: true });
    
    const Match = mongoose.model('Match', MatchSchema, 'matches');

    // Delete the match first to force fresh fetch
    console.log('🗑️ Deleting existing match 117359...');
    await Match.deleteOne({ matchId: '117359' });
    console.log('✅ Match deleted');

    await mongoose.disconnect();
    console.log('📊 Disconnected from database');

    // Now call the sync API
    console.log('🔄 Calling sync API...');
    
    const postData = JSON.stringify({});
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/matches/117359/sync-details',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ Fresh sync completed');
          
          if (result.match && result.match.teams) {
            console.log('\n🏏 FRESH TEAM SCORES:');
            result.match.teams.forEach((team, index) => {
              console.log(`Team ${index + 1}: ${team.teamName} - ${team.score.runs}/${team.score.wickets}`);
            });
            
            // Check if scores are correct now
            const indiaTeam = result.match.teams.find(t => t.teamName.toLowerCase().includes('india'));
            const wiTeam = result.match.teams.find(t => t.teamName.toLowerCase().includes('west indies') || t.teamName.toLowerCase().includes('wi'));
            
            if (indiaTeam && wiTeam) {
              console.log('\n✅ EXPECTED vs ACTUAL:');
              console.log(`India - Expected: 121/2, Actual: ${indiaTeam.score.runs}/${indiaTeam.score.wickets}`);
              console.log(`West Indies - Expected: 162/10, Actual: ${wiTeam.score.runs}/${wiTeam.score.wickets}`);
              
              const indiaCorrect = indiaTeam.score.runs === 121 && indiaTeam.score.wickets === 2;
              const wiCorrect = wiTeam.score.runs === 162 && wiTeam.score.wickets === 10;
              
              if (indiaCorrect && wiCorrect) {
                console.log('🎉 SCORES ARE NOW CORRECT!');
              } else {
                console.log('❌ SCORES ARE STILL INCORRECT!');
              }
            }
          }

        } catch (e) {
          console.log('❌ Error parsing response:', e.message);
          console.log('Raw response:', data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
    });

    req.write(postData);
    req.end();

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
};

forceRefreshMatch();