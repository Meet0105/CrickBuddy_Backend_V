// Simple script to refresh a specific match
const http = require('http');

const matchId = process.argv[2] || '117359'; // Default to India vs West Indies match

const postData = JSON.stringify({});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: `/api/matches/${matchId}/sync-details`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log(`🔄 Refreshing match ${matchId}...`);

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('✅ Match refreshed successfully');
      console.log('📊 Teams:', result.match?.teams?.map(team => ({
        name: team.teamName,
        score: `${team.score?.runs || 0}/${team.score?.wickets || 0}`
      })));
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(postData);
req.end();