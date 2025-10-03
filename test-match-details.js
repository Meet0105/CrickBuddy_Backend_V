const axios = require('axios');

async function testMatchDetails() {
  const backendUrl = 'https://crick-buddy-backend-v.vercel.app';
  
  console.log('🔍 Testing match details endpoint...\n');
  
  try {
    // First get some upcoming matches to get real match IDs
    console.log('1. 📅 Getting upcoming matches to find real match IDs...');
    const upcomingResponse = await axios.get(`${backendUrl}/api/matches/upcoming?limit=3`, {
      timeout: 15000
    });
    
    console.log(`Found ${upcomingResponse.data.length} upcoming matches`);
    
    if (upcomingResponse.data.length > 0) {
      const firstMatch = upcomingResponse.data[0];
      console.log(`\nFirst match: ${firstMatch.title}`);
      console.log(`Match ID: ${firstMatch.matchId}`);
      
      // Test the match details endpoint
      console.log(`\n2. 🔍 Testing match details for ID: ${firstMatch.matchId}`);
      const detailsResponse = await axios.get(`${backendUrl}/api/matches/${firstMatch.matchId}`, {
        timeout: 15000
      });
      
      console.log(`✅ Match details status: ${detailsResponse.status}`);
      console.log(`Match title: ${detailsResponse.data.title}`);
      console.log(`Teams: ${detailsResponse.data.teams?.[0]?.teamName} vs ${detailsResponse.data.teams?.[1]?.teamName}`);
      console.log(`Format: ${detailsResponse.data.format}`);
      console.log(`Status: ${detailsResponse.data.status}`);
      console.log(`Venue: ${detailsResponse.data.venue?.name}`);
      
      console.log('\n🎉 Match details endpoint is working correctly!');
    } else {
      console.log('❌ No upcoming matches found to test with');
    }
    
    // Test with a non-existent match ID
    console.log('\n3. 🧪 Testing with non-existent match ID...');
    try {
      await axios.get(`${backendUrl}/api/matches/999999`, { timeout: 10000 });
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Correctly returns 404 for non-existent match');
      } else {
        console.log(`❌ Unexpected error: ${error.response?.status}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing match details:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testMatchDetails();