const axios = require('axios');
require('dotenv').config();

async function debugRapidAPI() {
  console.log('🔍 Debugging RapidAPI calls...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('RAPIDAPI_KEY:', process.env.RAPIDAPI_KEY ? 'SET ✅' : 'NOT SET ❌');
  console.log('RAPIDAPI_HOST:', process.env.RAPIDAPI_HOST ? 'SET ✅' : 'NOT SET ❌');
  console.log('RAPIDAPI_MATCHES_UPCOMING_URL:', process.env.RAPIDAPI_MATCHES_UPCOMING_URL ? 'SET ✅' : 'NOT SET ❌');
  console.log('RAPIDAPI_MATCHES_LIVE_URL:', process.env.RAPIDAPI_MATCHES_LIVE_URL ? 'SET ✅' : 'NOT SET ❌');
  console.log('RAPIDAPI_MATCHES_RECENT_URL:', process.env.RAPIDAPI_MATCHES_RECENT_URL ? 'SET ✅' : 'NOT SET ❌');
  
  if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_HOST) {
    console.log('\n🔗 Testing API Endpoints:');
    
    const headers = {
      'x-rapidapi-key': process.env.RAPIDAPI_KEY,
      'x-rapidapi-host': process.env.RAPIDAPI_HOST
    };
    
    // Test upcoming matches
    if (process.env.RAPIDAPI_MATCHES_UPCOMING_URL) {
      try {
        console.log('\n📅 Testing Upcoming Matches API...');
        console.log('URL:', process.env.RAPIDAPI_MATCHES_UPCOMING_URL);
        
        const response = await axios.get(process.env.RAPIDAPI_MATCHES_UPCOMING_URL, {
          headers,
          timeout: 15000
        });
        
        console.log('✅ Status:', response.status);
        console.log('📊 Response structure:');
        console.log('- Has data:', !!response.data);
        console.log('- Has typeMatches:', !!response.data?.typeMatches);
        
        if (response.data?.typeMatches) {
          console.log('- typeMatches length:', response.data.typeMatches.length);
          response.data.typeMatches.forEach((type, index) => {
            console.log(`  Type ${index + 1}: ${type.matchType} (${type.seriesMatches?.length || 0} series)`);
          });
          
          // Look for upcoming matches specifically
          const upcomingType = response.data.typeMatches.find(type => 
            type.matchType === 'Upcoming Matches'
          );
          
          if (upcomingType) {
            console.log('✅ Found "Upcoming Matches" type');
            console.log('- Series count:', upcomingType.seriesMatches?.length || 0);
            
            if (upcomingType.seriesMatches && upcomingType.seriesMatches.length > 0) {
              let totalMatches = 0;
              upcomingType.seriesMatches.forEach((series, index) => {
                const matchCount = series.seriesAdWrapper?.matches?.length || 0;
                totalMatches += matchCount;
                console.log(`  Series ${index + 1}: ${matchCount} matches`);
              });
              console.log(`📊 Total upcoming matches found: ${totalMatches}`);
            }
          } else {
            console.log('❌ No "Upcoming Matches" type found');
            console.log('Available types:', response.data.typeMatches.map(t => t.matchType));
          }
        }
        
      } catch (error) {
        console.log('❌ Upcoming matches API error:');
        console.log('Status:', error.response?.status);
        console.log('Message:', error.message);
        if (error.response?.data) {
          console.log('Response:', JSON.stringify(error.response.data, null, 2));
        }
      }
    }
    
    // Test live matches
    if (process.env.RAPIDAPI_MATCHES_LIVE_URL) {
      try {
        console.log('\n🔴 Testing Live Matches API...');
        console.log('URL:', process.env.RAPIDAPI_MATCHES_LIVE_URL);
        
        const response = await axios.get(process.env.RAPIDAPI_MATCHES_LIVE_URL, {
          headers,
          timeout: 15000
        });
        
        console.log('✅ Status:', response.status);
        console.log('📊 Response structure:');
        console.log('- Has data:', !!response.data);
        console.log('- Has typeMatches:', !!response.data?.typeMatches);
        
        if (response.data?.typeMatches) {
          const liveType = response.data.typeMatches.find(type => 
            type.matchType === 'Live Matches'
          );
          
          if (liveType) {
            console.log('✅ Found "Live Matches" type');
            let totalMatches = 0;
            if (liveType.seriesMatches) {
              liveType.seriesMatches.forEach(series => {
                totalMatches += series.seriesAdWrapper?.matches?.length || 0;
              });
            }
            console.log(`📊 Total live matches found: ${totalMatches}`);
          } else {
            console.log('❌ No "Live Matches" type found');
          }
        }
        
      } catch (error) {
        console.log('❌ Live matches API error:');
        console.log('Status:', error.response?.status);
        console.log('Message:', error.message);
      }
    }
    
  } else {
    console.log('\n❌ Missing required environment variables!');
    console.log('Please set RAPIDAPI_KEY and RAPIDAPI_HOST in your .env file or Vercel environment variables.');
  }
  
  console.log('\n🎯 Debug completed!');
}

debugRapidAPI();