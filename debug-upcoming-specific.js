const axios = require('axios');
require('dotenv').config();

async function debugUpcomingSpecific() {
  console.log('🔍 Debugging upcoming matches specifically...\n');
  
  if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_MATCHES_UPCOMING_URL) {
    try {
      console.log('📅 Fetching upcoming matches from RapidAPI...');
      console.log('URL:', process.env.RAPIDAPI_MATCHES_UPCOMING_URL);
      
      const response = await axios.get(process.env.RAPIDAPI_MATCHES_UPCOMING_URL, {
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY,
          'x-rapidapi-host': process.env.RAPIDAPI_HOST
        },
        timeout: 15000
      });
      
      console.log('✅ Status:', response.status);
      console.log('📊 Response structure:');
      
      if (response.data && response.data.typeMatches) {
        console.log('- typeMatches length:', response.data.typeMatches.length);
        
        let totalMatches = 0;
        
        response.data.typeMatches.forEach((matchType, index) => {
          console.log(`\n📋 Type ${index + 1}: ${matchType.matchType}`);
          console.log('- Series count:', matchType.seriesMatches?.length || 0);
          
          if (matchType.seriesMatches) {
            let typeMatches = 0;
            matchType.seriesMatches.forEach((series, seriesIndex) => {
              const matchCount = series.seriesAdWrapper?.matches?.length || 0;
              typeMatches += matchCount;
              if (matchCount > 0) {
                console.log(`  Series ${seriesIndex + 1}: ${matchCount} matches`);
                
                // Show first match details
                if (series.seriesAdWrapper?.matches?.[0]?.matchInfo) {
                  const match = series.seriesAdWrapper.matches[0].matchInfo;
                  console.log(`    Sample: ${match.team1?.teamName} vs ${match.team2?.teamName}`);
                  console.log(`    Format: ${match.matchFormat}`);
                  console.log(`    Status: ${match.status}`);
                }
              }
            });
            console.log(`  Total matches in ${matchType.matchType}: ${typeMatches}`);
            totalMatches += typeMatches;
          }
        });
        
        console.log(`\n🎯 TOTAL UPCOMING MATCHES FOUND: ${totalMatches}`);
        
        if (totalMatches === 0) {
          console.log('\n❌ No upcoming matches found in any category!');
          console.log('This might be because:');
          console.log('1. No upcoming matches scheduled in the API');
          console.log('2. All matches are in the past or live');
          console.log('3. API data structure changed');
        }
        
      } else {
        console.log('❌ No typeMatches found in response');
      }
      
    } catch (error) {
      console.log('❌ Error fetching upcoming matches:');
      console.log('Status:', error.response?.status);
      console.log('Message:', error.message);
      if (error.response?.data) {
        console.log('Response:', JSON.stringify(error.response.data, null, 2));
      }
    }
  } else {
    console.log('❌ Missing environment variables for upcoming matches API');
  }
}

debugUpcomingSpecific();