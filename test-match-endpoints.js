const axios = require('axios');

async function testMatchEndpoints() {
  const baseUrl = 'https://crick-buddy-backend-v.vercel.app';
  const matchId = '117359';
  
  const endpoints = [
    `/api/matches/${matchId}`,
    `/api/matches/${matchId}/scorecard`,
    `/api/matches/${matchId}/historical-scorecard`,
    `/api/matches/${matchId}/commentary`,
    `/api/matches/${matchId}/overs`
  ];
  
  console.log(`🔍 Testing match endpoints for match ID: ${matchId}\n`);
  
  for (const endpoint of endpoints) {
    try {
      const url = `${baseUrl}${endpoint}`;
      console.log(`Testing: ${endpoint}`);
      
      let response;
      if (endpoint.includes('sync-details')) {
        response = await axios.post(url);
      } else {
        response = await axios.get(url);
      }
      
      console.log(`✅ ${endpoint}: ${response.status} - Success`);
      if (response.data.message) {
        console.log(`   Message: ${response.data.message}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.response?.status || 'ERROR'} - ${error.message}`);
    }
    console.log('');
  }
  
  // Test sync-details endpoint separately (POST request)
  try {
    const syncUrl = `${baseUrl}/api/matches/${matchId}/sync-details`;
    console.log(`Testing: /api/matches/${matchId}/sync-details (POST)`);
    const response = await axios.post(syncUrl);
    console.log(`✅ sync-details: ${response.status} - Success`);
    if (response.data.message) {
      console.log(`   Message: ${response.data.message}`);
    }
  } catch (error) {
    console.log(`❌ sync-details: ${error.response?.status || 'ERROR'} - ${error.message}`);
  }
}

testMatchEndpoints();