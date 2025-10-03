// Simple script to help restart the server with clean state
console.log('🔄 Restarting server with clean API state...');

// Clear any cached modules
delete require.cache[require.resolve('./src/utils/rateLimiter.ts')];

console.log('✅ Server restart script completed');
console.log('💡 Please restart your server manually using: npm run dev');
console.log('📊 Monitor API status at: http://localhost:5000/api/admin/rate-limit-status');
console.log('🎛️ View admin dashboard at: http://localhost:3000/admin/api-status');