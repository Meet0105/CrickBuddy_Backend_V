const axios = require('axios');

async function testProductionUpcoming() {
  const backendUrl = 'https://crick-buddy-backend-v.vercel.app';
  
  console.log('🔍 Testing production upcoming matches API...\n');
  
  try {
    console.log('📅 Testing upcoming matches endpoint...');
    const response = await axios.get(`${backendUrl}/api/matches/upcoming?limit=5`, {
      headers: { 
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 15000
    });
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Data count: ${response.data.length}`);
    
    if (response.data.length > 0) {
      console.log('\n🏏 Upcoming matches found:');
      response.data.forEach((match, index) => {
        console.log(`${index + 1}. ${match.title || 'No title'}`);
        console.log(`   Teams: ${match.teams?.[0]?.teamName || 'Team1'} vs ${match.teams?.[1]?.teamName || 'Team2'}`);
        console.log(`   Format: ${match.format}`);
        console.log(`   Status: ${match.status}`);
        console.log(`   Venue: ${match.venue?.name || 'TBD'}`);
        console.log('');
      });
    } else {
      console.log('\n❌ No upcoming matches returned');
      console.log('This could mean:');
      console.log('1. API changes not deployed yet');
      console.log('2. Environment variables not set in Vercel');
      console.log('3. RapidAPI rate limit exceeded');
      console.log('4. Processing logic still has issues');
    }
    
    // Test if we can see the raw response structure
    console.log('\n🔍 Response headers:');
    console.log('Content-Type:', response.headers['content-type']);
    console.log('Date:', response.headers.date);
    
  } catch (error) {
    console.error('❌ Error testing production API:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

testProductionUpcoming();