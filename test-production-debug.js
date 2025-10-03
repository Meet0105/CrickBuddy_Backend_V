const axios = require('axios');

async function testProductionDebug() {
  const backendUrl = 'https://crick-buddy-backend-v.vercel.app';
  
  console.log('🔍 Testing production debug endpoints...\n');
  
  try {
    // Test environment variables
    console.log('1. 📋 Checking environment variables...');
    const envResponse = await axios.get(`${backendUrl}/api/debug/env`, {
      timeout: 10000
    });
    
    console.log('Environment Variables Status:');
    Object.entries(envResponse.data).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    // Test upcoming matches with debug info
    console.log('\n2. 📅 Testing upcoming matches with debug...');
    const upcomingResponse = await axios.get(`${backendUrl}/api/matches/upcoming?limit=3`, {
      timeout: 15000
    });
    
    console.log(`Status: ${upcomingResponse.status}`);
    console.log(`Data count: ${upcomingResponse.data.length}`);
    
    if (upcomingResponse.data.length > 0) {
      console.log('\n✅ Upcoming matches found:');
      upcomingResponse.data.forEach((match, index) => {
        console.log(`${index + 1}. ${match.title}`);
        console.log(`   Teams: ${match.teams?.[0]?.teamName} vs ${match.teams?.[1]?.teamName}`);
      });
    } else {
      console.log('\n❌ Still no upcoming matches returned');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testProductionDebug();