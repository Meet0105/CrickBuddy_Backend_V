const axios = require('axios');

async function testRealData() {
  const backendUrl = 'https://crick-buddy-backend-v.vercel.app';
  
  console.log('🔍 Testing real data from production backend...\n');
  
  try {
    // Test upcoming matches
    console.log('📅 Testing upcoming matches:');
    const upcomingResponse = await axios.get(`${backendUrl}/api/matches/upcoming?limit=3`, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    console.log(`Status: ${upcomingResponse.status}`);
    console.log(`Data count: ${upcomingResponse.data.length}`);
    
    if (upcomingResponse.data.length > 0) {
      upcomingResponse.data.forEach((match, index) => {
        console.log(`\n  Match ${index + 1}:`);
        console.log(`    Title: ${match.title}`);
        console.log(`    Status: ${match.status}`);
        console.log(`    Format: ${match.format}`);
        if (match.teams && match.teams.length >= 2) {
          console.log(`    Teams: ${match.teams[0].teamName} vs ${match.teams[1].teamName}`);
        }
        if (match.venue) {
          console.log(`    Venue: ${match.venue.name}, ${match.venue.city}`);
        }
      });
    } else {
      console.log('  ❌ No upcoming matches found');
    }
    
    // Test live matches
    console.log('\n\n🔴 Testing live matches:');
    const liveResponse = await axios.get(`${backendUrl}/api/matches/live`, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    console.log(`Status: ${liveResponse.status}`);
    console.log(`Data count: ${liveResponse.data.length}`);
    
    if (liveResponse.data.length === 0) {
      console.log('  ℹ️ No live matches (this is normal)');
    }
    
    // Test recent matches
    console.log('\n\n📊 Testing recent matches:');
    const recentResponse = await axios.get(`${backendUrl}/api/matches/recent?limit=3`, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    console.log(`Status: ${recentResponse.status}`);
    console.log(`Data count: ${recentResponse.data.length}`);
    
    if (recentResponse.data.length === 0) {
      console.log('  ℹ️ No recent matches found');
    }
    
    console.log('\n🎉 Backend is working correctly!');
    console.log('💡 If frontend shows empty data, clear browser cache or try incognito mode.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testRealData();