const axios = require('axios');

async function testScores() {
  try {
    console.log('Testing live matches endpoint...');
    
    // Test production backend
    const response = await axios.get('https://crick-buddy-backend.vercel.app/api/matches/live');
    
    console.log('Response received:', response.status);
    console.log('Number of matches:', response.data.length);
    
    if (response.data.length > 0) {
      const firstMatch = response.data[0];
      console.log('\nFirst match data:');
      console.log('Title:', firstMatch.title);
      console.log('Status:', firstMatch.status);
      console.log('Teams:', firstMatch.teams?.map(t => ({
        name: t.teamName,
        score: t.score
      })));
    }
    
  } catch (error) {
    console.error('Error testing scores:', error.message);
  }
}

testScores();