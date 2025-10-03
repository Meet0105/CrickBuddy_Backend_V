// Check if India vs West Indies match is in live matches
const http = require('http');

const checkLiveMatches = async () => {
  try {
    console.log('🔍 Checking live matches...');

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/matches/live',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const matches = JSON.parse(data);
          console.log(`Found ${matches.length} live matches`);
          
          // Look for India vs West Indies match
          const indiaWIMatch = matches.find(match => 
            match.teams && match.teams.some(team => 
              team.teamName && team.teamName.toLowerCase().includes('india')
            ) && match.teams.some(team => 
              team.teamName && (team.teamName.toLowerCase().includes('west indies') || team.teamName.toLowerCase().includes('wi'))
            )
          );
          
          if (indiaWIMatch) {
            console.log('\n🏏 FOUND INDIA vs WEST INDIES MATCH:');
            console.log('Match ID:', indiaWIMatch.matchId);
            console.log('Title:', indiaWIMatch.title);
            console.log('Status:', indiaWIMatch.status);
            console.log('Teams:');
            indiaWIMatch.teams.forEach((team, index) => {
              console.log(`  Team ${index + 1}: ${team.teamName} - ${team.score.runs}/${team.score.wickets}`);
            });
          } else {
            console.log('\n❌ India vs West Indies match NOT FOUND in live matches');
            console.log('\nAvailable matches:');
            matches.forEach((match, index) => {
              console.log(`${index + 1}. ${match.title || 'Unknown'} (${match.matchId})`);
              if (match.teams) {
                match.teams.forEach(team => {
                  console.log(`   ${team.teamName}: ${team.score.runs}/${team.score.wickets}`);
                });
              }
            });
          }

        } catch (e) {
          console.log('❌ Error parsing response:', e.message);
          console.log('Raw response:', data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
    });

    req.end();

  } catch (error) {
    console.error('❌ Error:', error);
  }
};

checkLiveMatches();