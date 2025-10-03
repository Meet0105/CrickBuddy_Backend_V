// Quick script to disable endpoints that return 403 errors
const http = require('http');

const disableEndpoint = async (flagName) => {
  const postData = JSON.stringify({
    flagName: flagName,
    enabled: false
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/feature-flags/update',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

const main = async () => {
  console.log('🔧 Disabling endpoints that return 403 errors...');
  
  const endpointsToDisable = [
    'ENABLE_UPCOMING_MATCHES_API',
    'ENABLE_LIVE_MATCHES_API', 
    'ENABLE_RECENT_MATCHES_API',
    'ENABLE_MATCH_COMMENTARY',
    'ENABLE_HISTORICAL_DATA',
    'ENABLE_OVERS_DATA'
  ];

  for (const endpoint of endpointsToDisable) {
    try {
      const result = await disableEndpoint(endpoint);
      console.log(`✅ Disabled ${endpoint}`);
    } catch (error) {
      console.log(`❌ Failed to disable ${endpoint}:`, error.message);
    }
  }

  console.log('\n🎯 Summary:');
  console.log('- Disabled API endpoints that require higher subscription tiers');
  console.log('- Your app will now use cached database data instead');
  console.log('- This prevents 403 "Forbidden" errors');
  console.log('\n📊 Check status at: http://localhost:5000/api/admin/feature-flags');
};

main().catch(console.error);