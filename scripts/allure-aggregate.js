#!/usr/bin/env node

/**
 * Aggregates Allure test results from all projects into a single report
 * Usage: node scripts/allure-aggregate.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const AGGREGATE_RESULTS_DIR = path.join(ROOT_DIR, 'allure-results-aggregated');
const AGGREGATE_REPORT_DIR = path.join(ROOT_DIR, 'allure-report-aggregated');

// Project configurations
const projects = [
  {
    name: 'Backend (Jest)',
    resultsDir: path.join(ROOT_DIR, 'leave-attendance-backend', 'allure-results'),
  },
  {
    name: 'Backend Performance (k6)',
    resultsDir: path.join(ROOT_DIR, 'leave-attendance-backend', 'allure-results'),
  },
  {
    name: 'Frontend A11y (Jest)',
    resultsDir: path.join(ROOT_DIR, 'admin-web', 'allure-results'),
  },
  {
    name: 'Frontend E2E (Mocha/Selenium)',
    resultsDir: path.join(ROOT_DIR, 'admin-web', 'allure-results'),
  },
  {
    name: 'Mobile (Appium/Mocha)',
    resultsDir: path.join(ROOT_DIR, 'mobile-app', 'allure-results'),
  },
];

console.log('🔍 Aggregating Allure test results from all projects...\n');

// Clean and create aggregate results directory
if (fs.existsSync(AGGREGATE_RESULTS_DIR)) {
  fs.rmSync(AGGREGATE_RESULTS_DIR, { recursive: true, force: true });
}
fs.mkdirSync(AGGREGATE_RESULTS_DIR, { recursive: true });

let totalFiles = 0;

// Copy results from each project
projects.forEach((project) => {
  const { name, resultsDir } = project;
  
  if (!fs.existsSync(resultsDir)) {
    console.log(`⚠️  Skipping ${name}: Results directory not found at ${resultsDir}`);
    return;
  }

  const files = fs.readdirSync(resultsDir);
  if (files.length === 0) {
    console.log(`⚠️  Skipping ${name}: No results found`);
    return;
  }

  console.log(`📦 Copying results from ${name}...`);
  files.forEach((file) => {
    const srcPath = path.join(resultsDir, file);
    const destPath = path.join(AGGREGATE_RESULTS_DIR, `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${file}`);
    
    if (fs.statSync(srcPath).isFile()) {
      fs.copyFileSync(srcPath, destPath);
      totalFiles++;
    }
  });
  console.log(`   ✅ Copied ${files.length} file(s)\n`);
});

if (totalFiles === 0) {
  console.log('❌ No test results found. Please run tests first:');
  console.log('   - Backend: cd leave-attendance-backend && npm run test:allure');
  console.log('   - Frontend A11y: cd admin-web && npm run a11y:test:allure');
  console.log('   - Frontend E2E: cd admin-web && npm run e2e:test:allure');
  console.log('   - Mobile: cd mobile-app && npm run mobile:test');
  process.exit(1);
}

console.log(`\n📊 Total files aggregated: ${totalFiles}`);
console.log('🔨 Generating aggregated Allure report...\n');

// Generate aggregated report
try {
  execSync(
    `allure generate "${AGGREGATE_RESULTS_DIR}" --clean -o "${AGGREGATE_REPORT_DIR}"`,
    { stdio: 'inherit', cwd: ROOT_DIR }
  );
  
  console.log('\n✅ Aggregated Allure report generated successfully!');
  console.log(`📁 Report location: ${AGGREGATE_REPORT_DIR}`);
  console.log('\n💡 To view the report, run:');
  console.log('   npm run allure:aggregate:open');
  console.log('\n   Or manually:');
  console.log(`   allure open "${AGGREGATE_REPORT_DIR}"`);
} catch (error) {
  console.error('\n❌ Failed to generate Allure report:', error.message);
  process.exit(1);
}

