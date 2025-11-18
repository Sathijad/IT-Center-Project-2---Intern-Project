// Setup file for Selenium tests
// This can be used to configure Jest if needed

const http = require('http');

// Set longer timeout for Selenium tests
jest.setTimeout(120000); // 120 seconds (2 minutes) for Selenium operations

// Global variable to track if login is done
global.__SELENIUM_LOGIN_DONE__ = false;

// Check if mock server is running
async function checkMockServer() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5050/me', { timeout: 2000 }, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Check at setup time
(async () => {
  const mockServerRunning = await checkMockServer();
  const baseUrl = process.env.WEB_BASE_URL || 'http://localhost:5173';
  
  if (mockServerRunning) {
    console.log('\n✅ Mock server is running on port 5050');
    console.log('   Tests will use mock data from mock server.');
    console.log('   Make sure frontend is running with: npm run e2e:web\n');
  } else {
    console.log('\n⚠️  Mock server is NOT running on port 5050');
    console.log('   RECOMMENDED: Start mock server for better testing:');
    console.log('   Terminal 1: npm run e2e:api');
    console.log('   Terminal 2: npm run e2e:web');
    console.log('   Terminal 3: npm run selenium:test\n');
    console.log('   Without mock server: Pages will have no data, tests may fail.\n');
  }
})();

