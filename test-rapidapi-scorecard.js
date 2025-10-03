const axios = require('axios');
require('dotenv').config();

async function testRapidAPIScorecard() {
  try {
    console.log('🔍 Testing RapidAPI scorecard endpoints...');
    
    const matchId = '117359'; // Test match ID
    
    // Test different scorecard endpoints
    const endpoints = [
      `${process.env.RAPIDAPI_MATCHES_INFO_URL}/${matchId}/scorecard`,
      `${process.env.RAPIDAPI_MATCHES_INFO_URL}/${matchId}/hscard`,
      `${process.env.RAPIDAPI_MATCHES_INFO_URL}/${matchId}/commentary`,
      `${process.env.RAPIDAPI_MATCHES_INFO_URL}/${matchId}/overs`
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\n📡 Testing: ${endpoint}`);
        
        const response = await axios.get(endpoint, {
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          },
          timeout: 10000
        });
        
        console.log(`✅ Status: ${response.status}`);
        console.log(`📊 Data keys:`, Object.keys(response.data || {}));
        
        if (response.data) {
          // Check for common data structures
          if (response.data.scoreCard) {
            console.log(`🏏 Found scoreCard with ${response.data.scoreCard.length} innings`);
          }
          if (response.data.commentaryList) {
            console.log(`💬 Found commentaryList with ${response.data.commentaryList.length} items`);
          }
          if (response.data.overs) {
            console.log(`⚾ Found overs data`);
          }
        }
        
      } catch (error) {
        console.log(`❌ Error: ${error.response?.status || error.message}`);
        if (error.response?.data) {
          console.log(`📄 Error data:`, error.response.data);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRapidAPIScorecard();