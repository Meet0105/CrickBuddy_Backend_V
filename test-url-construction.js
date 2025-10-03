// Test URL construction to identify the double slash issue

const testUrls = [
  'https://crick-buddy-backend-v.vercel.app/',  // With trailing slash (WRONG)
  'https://crick-buddy-backend-v.vercel.app'    // Without trailing slash (CORRECT)
];

testUrls.forEach((apiUrl, index) => {
  const constructedUrl = `${apiUrl}/api/matches/recent?limit=5`;
  console.log(`Test ${index + 1}:`);
  console.log(`  Base URL: ${apiUrl}`);
  console.log(`  Constructed: ${constructedUrl}`);
  console.log(`  Has double slash: ${constructedUrl.includes('//api') ? '❌ YES' : '✅ NO'}`);
  console.log('');
});

console.log('🎯 The issue is the trailing slash in NEXT_PUBLIC_API_URL environment variable!');
console.log('✅ Set it to: https://crick-buddy-backend-v.vercel.app (no trailing slash)');