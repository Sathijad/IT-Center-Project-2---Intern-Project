#!/usr/bin/env node

/**
 * Runs k6 performance tests and automatically converts results to Allure format
 * Usage: node run-k6-with-allure.js [scenario]
 * 
 * Scenarios: smoke, load, stress, spike, or comprehensive (default)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const scenario = process.argv[2] || 'comprehensive';
const scenarios = {
  smoke: 'scenarios/smoke-test.js',
  load: 'scenarios/load-test.js',
  stress: 'scenarios/stress-test.js',
  spike: 'scenarios/spike-test.js',
  comprehensive: 'phase2-comprehensive-test.js',
  health: 'health-check-test.js',
};

const testScript = scenarios[scenario];
if (!testScript) {
  console.error(`Unknown scenario: ${scenario}`);
  console.error(`Available scenarios: ${Object.keys(scenarios).join(', ')}`);
  process.exit(1);
}

const scriptPath = path.join(__dirname, testScript);
if (!fs.existsSync(scriptPath)) {
  console.error(`Test script not found: ${scriptPath}`);
  process.exit(1);
}

console.log(`🚀 Running k6 ${scenario} test...`);
console.log(`   Script: ${testScript}\n`);

// Get k6 path
const k6Path = process.env.K6_PATH || 'k6';
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
const accessToken = process.env.ACCESS_TOKEN || '';

// Build k6 command
const k6Cmd = `${k6Path} run "${scriptPath}" --env API_BASE_URL=${apiBaseUrl}`;
const fullCmd = accessToken ? `${k6Cmd} --env ACCESS_TOKEN=${accessToken}` : k6Cmd;

try {
  // Run k6 test
  execSync(fullCmd, {
    stdio: 'inherit',
    cwd: __dirname,
    env: {
      ...process.env,
      API_BASE_URL: apiBaseUrl,
      ACCESS_TOKEN: accessToken,
    },
  });
} catch (error) {
  console.error('\n❌ k6 test execution failed');
  process.exit(1);
}

// Find the latest k6 JSON result file
console.log('\n📊 Converting k6 results to Allure format...');

// Find JSON result files (k6 outputs files with timestamp pattern)
const resultPattern = path.join(__dirname, '*.json');
let jsonFiles = [];
try {
  const allFiles = fs.readdirSync(__dirname);
  jsonFiles = allFiles
    .filter(file => {
      // Match k6 result file patterns: health-check-*.json, phase2-performance-*.json, etc.
      return file.endsWith('.json') && 
             (file.includes('health-check-') || 
              file.includes('phase2-performance-') || 
              file.includes('attendance-load-test-report'));
    })
    .map(file => path.join(__dirname, file))
    .filter(file => {
      const stats = fs.statSync(file);
      return stats.mtime > new Date(Date.now() - 60000); // Files modified in last minute
    })
    .sort((a, b) => {
      const statsA = fs.statSync(a);
      const statsB = fs.statSync(b);
      return statsB.mtime - statsA.mtime; // Most recent first
    });
} catch (error) {
  console.error('Error reading directory:', error.message);
}

if (jsonFiles.length === 0) {
  console.log('⚠️  No k6 JSON result files found');
  console.log('   Make sure your k6 test outputs JSON results');
  process.exit(0);
}

// Convert the most recent result file
const latestResult = jsonFiles[0];
console.log(`   Found result file: ${path.basename(latestResult)}`);

try {
  // Run converter
  const converterPath = path.join(__dirname, 'k6-to-allure.js');
  const allureResultsDir = path.join(__dirname, '..', '..', 'allure-results');
  
  execSync(`node "${converterPath}" "${latestResult}" "${allureResultsDir}"`, {
    stdio: 'inherit',
    cwd: __dirname,
  });
  
  console.log('\n✅ k6 test completed and converted to Allure format!');
  console.log(`\n💡 To view the Allure report:`);
  console.log(`   npm run allure:generate`);
  console.log(`   npm run allure:open`);
  console.log(`\n   Or serve directly:`);
  console.log(`   npm run allure:serve`);
  
} catch (error) {
  console.error('\n❌ Failed to convert k6 results to Allure format');
  console.error(error.message);
  process.exit(1);
}

