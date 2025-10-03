const axios = require('axios');
require('dotenv').config();

async function testRapidAPIScorecard() {
  const matchId = '117359'; // Test match ID
  
  console.log('🔍 Testing RapidAPI scorecard endpoints...');
  console.log('Match ID:', matchId);
  console.log('API Key available:', !!process.env.RAPIDAPI_KEY);
  console.log('Base URL:', process.env.RAPIDAPI_MATCHES_INFO_URL);
  
  const endpoints = [
    `/scorecard`,
    `/hscard`,
    `/scoreCard`,
    `/score`,
    `/live-score`
  ];
  
  for (const endpoint of endpoints) {
    try {
      const url = `${process.env.RAPIDAPI_MATCHES_INFO_URL}/${matchId}${endpoint}`;
      console.log(`\n🌐 Testing: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY,
          'x-rapidapi-host': process.env.RAPIDAPI_HOST
        },
        timeout: 10000
      });
      
      console.log(`✅ ${endpoint}: Status ${response.status}`);
      console.log('Response keys:', Object.keys(response.data || {}));
      
      if (response.data) {
        // Check for common scorecard properties
        const hasScorecard = response.data.scoreCard || response.data.scorecard || response.data.innings;
        if (hasScorecard) {
          console.log('📊 Found scorecard data!');
          console.log('Data structure:', typeof hasScorecard, Array.isArray(hasScorecard) ? `Array[${hasScorecard.length}]` : 'Object');
        }
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.response?.status || 'ERROR'} - ${error.message}`);
    }
  }
  
  // Also test the match info endpoint to see what data is available
  try {
    console.log(`\n🌐 Testing match info endpoint...`);
    const infoUrl = `${process.env.RAPIDAPI_MATCHES_INFO_URL}/${matchId}`;
    
    const response = await axios.get(infoUrl, {
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': process.env.RAPIDAPI_HOST
      },
      timeout: 10000
    });
    
    console.log(`✅ Match info: Status ${response.status}`);
    console.log('Available data:', Object.keys(response.data || {}));
    
    if (response.data.matchHeader) {
      console.log('Match header keys:', Object.keys(response.data.matchHeader || {}));
    }
    
  } catch (error) {
    console.log(`❌ Match info: ${error.response?.status || 'ERROR'} - ${error.message}`);
  }
}

testRapidAPIScorecard();