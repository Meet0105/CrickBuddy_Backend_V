const axios = require('axios');

async function testProductionBackend() {
  const backendUrl = 'https://crick-buddy-backend-v.vercel.app';
  
  console.log('🔍 Testing production backend...');
  console.log('Backend URL:', backendUrl);
  
  try {
    // Test basic health check
    console.log('\n1. Testing basic connection...');
    const healthResponse = await axios.get(`${backendUrl}/`, { timeout: 10000 });
    console.log('✅ Basic connection:', healthResponse.status);
    console.log('Response:', healthResponse.data);
    
    // Test all match endpoints individually
    const endpoints = [
      '/api/matches',
      '/api/matches/live', 
      '/api/matches/recent',
      '/api/matches/upcoming'
    ];
    
    console.log('\n2. Testing all match endpoints...');
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\nTesting: ${backendUrl}${endpoint}`);
        const response = await axios.get(`${backendUrl}${endpoint}`, { 
          timeout: 15000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Test-Client'
          }
        });
        console.log(`✅ ${endpoint}: ${response.status} - Data length: ${response.data?.length || 'N/A'}`);
        
        if (response.data?.length > 0) {
          const firstItem = response.data[0];
          console.log(`   First item: ${firstItem.title || firstItem.matchId || 'No title'}`);
        }
      } catch (e) {
        console.log(`❌ ${endpoint}: ${e.response?.status || e.code} - ${e.response?.statusText || e.message}`);
        if (e.response?.data) {
          console.log(`   Error data:`, e.response.data);
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ Backend test failed:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    if (error.code) {
      console.error('Code:', error.code);
    }
  }
}

testProductionBackend();