const axios = require('axios');

async function debugRawScores() {
  try {
    console.log('🔍 Debugging raw score data structures...');
    
    const response = await axios.get('https://crick-buddy-backend-v.vercel.app/api/matches/live');
    
    if (response.data.length > 0) {
      // Find the match with raw score data but showing 0/0
      const problematicMatch = response.data.find(match => 
        match.raw && 
        match.raw.matchScore && 
        match.teams && 
        match.teams[0].score.runs === 0 &&
        match.teams[1].score.runs === 0
      );
      
      if (problematicMatch) {
        console.log('\n🐛 Found problematic match:');
        console.log('Title:', problematicMatch.title);
        console.log('Teams:', problematicMatch.teams.map(t => t.teamName));
        
        console.log('\n📊 Raw matchScore structure:');
        console.log(JSON.stringify(problematicMatch.raw.matchScore, null, 2));
        
        console.log('\n🔍 Analyzing team1Score:');
        const team1Score = problematicMatch.raw.matchScore.team1Score;
        if (team1Score) {
          console.log('team1Score keys:', Object.keys(team1Score));
          console.log('team1Score structure:', JSON.stringify(team1Score, null, 2));
        }
        
        console.log('\n🔍 Analyzing team2Score:');
        const team2Score = problematicMatch.raw.matchScore.team2Score;
        if (team2Score) {
          console.log('team2Score keys:', Object.keys(team2Score));
          console.log('team2Score structure:', JSON.stringify(team2Score, null, 2));
        }
      } else {
        console.log('❌ No problematic match found');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugRawScores();