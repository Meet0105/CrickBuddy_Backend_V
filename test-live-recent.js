const axios = require('axios');

async function testLiveRecent() {
  const backendUrl = 'https://crick-buddy-backend-v.vercel.app';
  
  console.log('🔍 Testing live and recent matches...\n');
  
  try {
    // Test live matches
    console.log('1. 🔴 Testing live matches...');
    const liveResponse = await axios.get(`${backendUrl}/api/matches/live`, {
      timeout: 15000
    });
    
    console.log(`Live matches status: ${liveResponse.status}`);
    console.log(`Live matches count: ${liveResponse.data.length}`);
    
    if (liveResponse.data.length > 0) {
      console.log('Live matches found:');
      liveResponse.data.forEach((match, index) => {
        console.log(`  ${index + 1}. ${match.title}`);
      });
    } else {
      console.log('ℹ️ No live matches (this is normal if no matches are currently live)');
    }
    
    // Test recent matches
    console.log('\n2. 📊 Testing recent matches...');
    const recentResponse = await axios.get(`${backendUrl}/api/matches/recent?limit=5`, {
      timeout: 15000
    });
    
    console.log(`Recent matches status: ${recentResponse.status}`);
    console.log(`Recent matches count: ${recentResponse.data.length}`);
    
    if (recentResponse.data.length > 0) {
      console.log('Recent matches found:');
      recentResponse.data.forEach((match, index) => {
        console.log(`  ${index + 1}. ${match.title}`);
      });
    } else {
      console.log('❌ No recent matches found');
    }
    
    // Test the RapidAPI directly to see what's available
    console.log('\n3. 🌐 Testing RapidAPI directly...');
    
    if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_MATCHES_RECENT_URL) {
      try {
        const directResponse = await axios.get(process.env.RAPIDAPI_MATCHES_RECENT_URL, {
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          },
          timeout: 10000
        });
        
        console.log('Direct RapidAPI response structure:');
        console.log('- Has typeMatches:', !!directResponse.data?.typeMatches);
        
        if (directResponse.data?.typeMatches) {
          console.log('- typeMatches length:', directResponse.data.typeMatches.length);
          directResponse.data.typeMatches.forEach((type, index) => {
            console.log(`  Type ${index + 1}: ${type.matchType} (${type.seriesMatches?.length || 0} series)`);
          });
        }
      } catch (apiError) {
        console.log('❌ Direct RapidAPI error:', apiError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing live/recent matches:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Load environment variables
require('dotenv').config();
testLiveRecent();