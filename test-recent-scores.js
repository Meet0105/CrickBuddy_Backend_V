const axios = require('axios');

async function testRecentScores() {
  try {
    console.log('🔍 Testing recent matches scores...');
    
    const response = await axios.get('https://crick-buddy-backend-v.vercel.app/api/matches/recent');
    
    console.log('✅ Response received:', response.status);
    console.log('📊 Number of matches:', response.data.length);
    
    if (response.data.length > 0) {
      console.log('\n🏏 Recent matches with scores:');
      
      response.data.slice(0, 5).forEach((match, index) => {
        console.log(`\n--- Match ${index + 1} ---`);
        console.log('Title:', match.title);
        console.log('Status:', match.status);
        
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
      });
    } else {
      console.log('❌ No recent matches found');
    }
    
  } catch (error) {
    console.error('❌ Error testing recent scores:', error.message);
  }
}

testRecentScores();