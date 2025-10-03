const axios = require('axios');

async function testCurrentScores() {
  try {
    console.log('🔍 Testing current match scores...');
    
    // Test a specific match
    const response = await axios.get('https://crick-buddy-backend-v.vercel.app/api/matches/117359');
    
    console.log('✅ Response received:', response.status);
    console.log('\n📊 Match data:');
    console.log('Title:', response.data.title);
    console.log('Status:', response.data.status);
    
    if (response.data.teams && response.data.teams.length >= 2) {
      console.log('\n🏏 Teams and Scores:');
      response.data.teams.forEach((team, index) => {
        console.log(`Team ${index + 1}:`, {
          name: team.teamName,
          score: team.score
        });
      });
    }
    
    // Test scorecard endpoint
    console.log('\n📋 Testing scorecard endpoint...');
    const scorecardResponse = await axios.get('https://crick-buddy-backend-v.vercel.app/api/matches/117359/scorecard');
    console.log('Scorecard status:', scorecardResponse.status);
    
    if (scorecardResponse.data.scorecard && scorecardResponse.data.scorecard.length > 0) {
      console.log('Scorecard innings:', scorecardResponse.data.scorecard.length);
    } else {
      console.log('Scorecard message:', scorecardResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCurrentScores();