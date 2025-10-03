const axios = require('axios');

async function debugRawScores() {
  try {
    console.log('🔍 Debugging raw score extraction...');
    
    // Get live matches data
    const response = await axios.get('https://crick-buddy-backend-v.vercel.app/api/matches/live');
    
    console.log('✅ Response received:', response.status);
    
    // Find matches with raw score data but zero extracted scores
    const matchesWithRawData = response.data.filter(match => {
      const hasRawScores = match.raw && match.raw.matchScore;
      const hasExtractedScores = match.teams && match.teams.some(team => 
        team.score && (team.score.runs > 0 || team.score.wickets > 0)
      );
      
      return hasRawScores && !hasExtractedScores;
    });
    
    console.log(`\n🔍 Found ${matchesWithRawData.length} matches with raw data but no extracted scores:`);
    
    matchesWithRawData.forEach((match, index) => {
      console.log(`\n--- Match ${index + 1}: ${match.title} ---`);
      console.log('Teams:', match.teams?.map(t => t.teamName));
      console.log('Raw matchScore structure:');
      console.log(JSON.stringify(match.raw.matchScore, null, 2));
      
      // Try to extract scores manually
      if (match.raw.matchScore.team1Score && match.raw.matchScore.team1Score.inngs1) {
        console.log('✅ Team 1 raw score found:', match.raw.matchScore.team1Score.inngs1);
      }
      if (match.raw.matchScore.team2Score && match.raw.matchScore.team2Score.inngs1) {
        console.log('✅ Team 2 raw score found:', match.raw.matchScore.team2Score.inngs1);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugRawScores();