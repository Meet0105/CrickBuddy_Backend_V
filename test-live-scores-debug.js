const axios = require('axios');

async function testLiveScores() {
  try {
    console.log('🔍 Testing live matches scores...');
    
    const response = await axios.get('https://crick-buddy-backend-v.vercel.app/api/matches/live');
    
    console.log('✅ Response received:', response.status);
    console.log('📊 Number of matches:', response.data.length);
    
    if (response.data.length > 0) {
      console.log('\n🏏 Live matches with scores:');
      
      response.data.forEach((match, index) => {
        console.log(`\n--- Match ${index + 1} ---`);
        console.log('Title:', match.title);
        console.log('Status:', match.status);
        console.log('Is Live:', match.isLive);
        
        if (match.teams && match.teams.length >= 2) {
          console.log('Team 1:', {
            name: match.teams[0].teamName,
            score: match.teams[0].score
          });
          console.log('Team 2:', {
            name: match.teams[1].teamName,
            score: match.teams[1].score
          });
        } else {
          console.log('❌ No teams data found');
        }
        
        // Check if raw data exists
        if (match.raw) {
          console.log('Raw data available:', !!match.raw);
          if (match.raw.matchScore) {
            console.log('Raw match score:', match.raw.matchScore);
          }
        }
      });
    } else {
      console.log('❌ No live matches found');
    }
    
  } catch (error) {
    console.error('❌ Error testing live scores:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testLiveScores();