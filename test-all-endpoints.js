const axios = require('axios');

async function testAllEndpoints() {
  const backendUrl = 'https://crick-buddy-backend-v.vercel.app';
  
  console.log('🔍 Testing all API endpoints...\n');
  
  const endpoints = [
    '/api/matches/upcoming',
    '/api/matches/live', 
    '/api/matches/recent',
    '/api/matches/135173',
    '/api/series',
    '/api/teams',
    '/api/teams/1',
    '/api/news',
    '/api/news/1',
    '/api/players/search?plrN=Virat',
    '/api/players/trending'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      const response = await axios.get(`${backendUrl}${endpoint}`, {
        timeout: 10000,
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      const dataLength = Array.isArray(response.data) ? response.data.length : 
                        typeof response.data === 'object' ? Object.keys(response.data).length : 'N/A';
      
      console.log(`✅ ${response.status} - Data: ${dataLength} items`);
      
      // Show sample data for key endpoints
      if (endpoint.includes('upcoming') && Array.isArray(response.data) && response.data.length > 0) {
        console.log(`   Sample: ${response.data[0].title}`);
      } else if (endpoint.includes('teams') && Array.isArray(response.data) && response.data.length > 0) {
        console.log(`   Sample: ${response.data[0].teamName}`);
      } else if (endpoint.includes('news') && Array.isArray(response.data) && response.data.length > 0) {
        console.log(`   Sample: ${response.data[0].headline}`);
      }
      
    } catch (error) {
      console.log(`❌ ${error.response?.status || 'ERROR'} - ${error.message}`);
    }
    console.log('');
  }
  
  console.log('🎉 All endpoints tested!');
}

testAllEndpoints();