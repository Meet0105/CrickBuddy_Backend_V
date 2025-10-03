const axios = require('axios');

async function testBackendStatus() {
  const backendUrl = 'https://crick-buddy-backend-v.vercel.app';
  
  console.log('🔍 Testing backend status...\n');
  
  try {
    // Test basic connectivity
    console.log('1. 🌐 Testing basic connectivity...');
    const basicResponse = await axios.get(`${backendUrl}/`, {
      timeout: 10000
    });
    
    console.log(`✅ Backend is online: ${basicResponse.status}`);
    console.log(`Message: ${basicResponse.data.message}`);
    
    // Test environment variables
    console.log('\n2. 📋 Testing environment variables...');
    const envResponse = await axios.get(`${backendUrl}/api/debug/env`, {
      timeout: 10000
    });
    
    console.log('Environment Variables:');
    Object.entries(envResponse.data).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    // Test upcoming matches
    console.log('\n3. 📅 Testing upcoming matches...');
    const upcomingResponse = await axios.get(`${backendUrl}/api/matches/upcoming?limit=3`, {
      timeout: 15000
    });
    
    console.log(`Status: ${upcomingResponse.status}`);
    console.log(`Count: ${upcomingResponse.data.length}`);
    
    if (upcomingResponse.data.length > 0) {
      const firstMatch = upcomingResponse.data[0];
      console.log(`First match: ${firstMatch.title}`);
      console.log(`Match ID: ${firstMatch.matchId}`);
      console.log(`Teams: ${firstMatch.teams?.[0]?.teamName} vs ${firstMatch.teams?.[1]?.teamName}`);
      
      // Test match details
      console.log('\n4. 🔍 Testing match details...');
      try {
        const detailsResponse = await axios.get(`${backendUrl}/api/matches/${firstMatch.matchId}`, {
          timeout: 10000
        });
        console.log(`✅ Match details work: ${detailsResponse.data.title}`);
      } catch (detailsError) {
        console.log(`❌ Match details error: ${detailsError.response?.status} - ${detailsError.message}`);
      }
    } else {
      console.log('❌ No upcoming matches found');
    }
    
    // Test live matches
    console.log('\n5. 🔴 Testing live matches...');
    try {
      const liveResponse = await axios.get(`${backendUrl}/api/matches/live`, {
        timeout: 10000
      });
      console.log(`✅ Live matches: ${liveResponse.status} - Count: ${liveResponse.data.length}`);
    } catch (liveError) {
      console.log(`❌ Live matches error: ${liveError.response?.status} - ${liveError.message}`);
    }
    
    // Test recent matches
    console.log('\n6. 📊 Testing recent matches...');
    try {
      const recentResponse = await axios.get(`${backendUrl}/api/matches/recent?limit=3`, {
        timeout: 10000
      });
      console.log(`✅ Recent matches: ${recentResponse.status} - Count: ${recentResponse.data.length}`);
    } catch (recentError) {
      console.log(`❌ Recent matches error: ${recentError.response?.status} - ${recentError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Backend is not accessible:');
    console.error('Error:', error.code || error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Possible solutions:');
      console.log('1. Check if the Vercel deployment is successful');
      console.log('2. Verify the backend URL is correct');
      console.log('3. Check if there are any deployment errors in Vercel dashboard');
    }
  }
}

testBackendStatus();