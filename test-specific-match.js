const axios = require('axios');

async function testSpecificMatch() {
  try {
    console.log('🔍 Testing specific match data structure...');
    
    const response = await axios.get('https://crick-buddy-backend-v.vercel.app/api/matches/117359');
    
    console.log('✅ Response received:', response.status);
    console.log('\n📊 Match data structure:');
    console.log('Title:', response.data.title);
    console.log('Status:', response.data.status);
    console.log('Is Live:', response.data.isLive);
    
    if (response.data.teams && response.data.teams.length >= 2) {
      console.log('\n🏏 Teams and Scores:');
      response.data.teams.forEach((team, index) => {
        console.log(`Team ${index + 1}:`, {
          name: team.teamName,
          shortName: team.teamShortName,
          score: team.score
        });
      });
    } else {
      console.log('❌ No teams data found');
    }
    
    console.log('\n🏟️ Venue:', response.data.venue);
    console.log('📅 Start Date:', response.data.startDate);
    console.log('🏆 Series:', response.data.series);
    
  } catch (error) {
    console.error('❌ Error testing specific match:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testSpecificMatch();