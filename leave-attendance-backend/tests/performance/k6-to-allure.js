#!/usr/bin/env node

/**
 * Converts k6 JSON test results to Allure XML format
 * Usage: node k6-to-allure.js <k6-json-file> [output-dir]
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const k6JsonFile = process.argv[2];
const outputDir = process.argv[3] || path.join(__dirname, '..', '..', 'allure-results');

if (!k6JsonFile) {
  console.error('Usage: node k6-to-allure.js <k6-json-file> [output-dir]');
  console.error('Example: node k6-to-allure.js health-check-1234567890.json');
  process.exit(1);
}

if (!fs.existsSync(k6JsonFile)) {
  console.error(`Error: File not found: ${k6JsonFile}`);
  process.exit(1);
}

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read k6 JSON results
let k6Data;
try {
  k6Data = JSON.parse(fs.readFileSync(k6JsonFile, 'utf8'));
} catch (error) {
  console.error(`Error reading k6 JSON file: ${error.message}`);
  process.exit(1);
}

// Extract test information
const metrics = k6Data.metrics || {};
const thresholds = k6Data.thresholds || {};
const rootGroups = k6Data.root_group || {};
const state = k6Data.state || {};

// Calculate test duration
const duration = state.testRunDurationMs ? state.testRunDurationMs / 1000 : 0;

// Determine overall status
const httpReqs = metrics.http_reqs?.values || {};
const httpFailed = metrics.http_req_failed?.values || {};
const errorRate = httpFailed.rate || 0;
const failedCount = httpReqs.count ? Math.round(httpReqs.count * errorRate) : 0;
const passedCount = httpReqs.count ? httpReqs.count - failedCount : 0;

// Check threshold status
let overallStatus = 'passed';
let overallMessage = 'All tests passed';

// Check if any thresholds failed
const failedThresholds = Object.keys(thresholds).filter(key => {
  const threshold = thresholds[key];
  return threshold && threshold.ok === false;
});

if (failedThresholds.length > 0) {
  overallStatus = 'failed';
  overallMessage = `Thresholds failed: ${failedThresholds.join(', ')}`;
} else if (errorRate > 0.01) {
  overallStatus = 'failed';
  overallMessage = `Error rate too high: ${(errorRate * 100).toFixed(2)}%`;
}

// Generate Allure XML
const testUuid = uuidv4();
const timestamp = Math.floor(Date.now());
const startTime = Math.floor(timestamp - (duration * 1000));

// Create test case XML
// Allure expects integer milliseconds for timestamps
const durationMs = Math.floor(duration * 1000);
const testCaseXml = `<?xml version="1.0" encoding="UTF-8"?>
<ns2:test-suite xmlns:ns2="urn:model.allure.qatools.yandex.ru" start="${startTime}" stop="${timestamp}" version="1.0">
  <name>k6 Performance Test</name>
  <title>k6 Performance Test - ${path.basename(k6JsonFile)}</title>
  <test-cases>
    <test-case start="${startTime}" stop="${timestamp}" status="${overallStatus}" duration="${durationMs}">
      <name>Performance Test Execution</name>
      <title>k6 Performance Test Results</title>
      <description>
        <![CDATA[
        <h3>Test Summary</h3>
        <ul>
          <li><strong>Total Requests:</strong> ${httpReqs.count || 0}</li>
          <li><strong>Passed:</strong> ${passedCount}</li>
          <li><strong>Failed:</strong> ${failedCount}</li>
          <li><strong>Error Rate:</strong> ${(errorRate * 100).toFixed(2)}%</li>
          <li><strong>Duration:</strong> ${duration.toFixed(2)}s</li>
        </ul>
        
        <h3>Response Time Metrics</h3>
        <ul>
          ${metrics.http_req_duration ? `
          <li><strong>Average:</strong> ${(metrics.http_req_duration.values.avg || 0).toFixed(2)}ms</li>
          <li><strong>Min:</strong> ${(metrics.http_req_duration.values.min || 0).toFixed(2)}ms</li>
          <li><strong>Max:</strong> ${(metrics.http_req_duration.values.max || 0).toFixed(2)}ms</li>
          <li><strong>p90:</strong> ${(metrics.http_req_duration.values['p(90)'] || 0).toFixed(2)}ms</li>
          <li><strong>p95:</strong> ${(metrics.http_req_duration.values['p(95)'] || 0).toFixed(2)}ms</li>
          <li><strong>p99:</strong> ${(metrics.http_req_duration.values['p(99)'] || 0).toFixed(2)}ms</li>
          ` : '<li>No duration metrics available</li>'}
        </ul>
        
        <h3>Thresholds</h3>
        <ul>
          ${Object.keys(thresholds).map(key => {
            const threshold = thresholds[key];
            const status = threshold && threshold.ok ? '✅ PASS' : '❌ FAIL';
            return `<li><strong>${key}:</strong> ${status}</li>`;
          }).join('\n          ')}
        </ul>
        
        <h3>Custom Metrics</h3>
        <ul>
          ${Object.keys(metrics).filter(key => !['http_reqs', 'http_req_duration', 'http_req_failed'].includes(key)).map(key => {
            const metric = metrics[key];
            if (metric && metric.values) {
              return `<li><strong>${key}:</strong> ${JSON.stringify(metric.values)}</li>`;
            }
            return '';
          }).filter(Boolean).join('\n          ')}
        </ul>
        ]]>
      </description>
      ${overallStatus === 'failed' ? `<failure>
        <message>${overallMessage}</message>
      </failure>` : ''}
      <steps>
        <step start="${startTime}" stop="${timestamp}" status="${overallStatus}" duration="${durationMs}">
          <name>k6 Test Execution</name>
          <title>Performance Test Run</title>
          <attachments>
            <attachment title="k6 JSON Results" source="${path.basename(k6JsonFile)}" type="application/json"/>
          </attachments>
        </step>
      </steps>
      <labels>
        <label name="framework" value="k6"/>
        <label name="language" value="javascript"/>
        <label name="testType" value="performance"/>
        <label name="suite" value="Performance Tests"/>
        <label name="testClass" value="k6"/>
      </labels>
    </test-case>
  </test-cases>
</ns2:test-suite>`;

// Write Allure XML file
const allureXmlFile = path.join(outputDir, `${testUuid}-testsuite.xml`);
fs.writeFileSync(allureXmlFile, testCaseXml, 'utf8');

// Copy k6 JSON as attachment
const attachmentDir = path.join(outputDir, testUuid + '-attachment');
if (!fs.existsSync(attachmentDir)) {
  fs.mkdirSync(attachmentDir, { recursive: true });
}
fs.copyFileSync(k6JsonFile, path.join(attachmentDir, path.basename(k6JsonFile)));

// Create environment properties (optional but useful)
const envProps = `k6.version=${k6Data.version || 'unknown'}
test.file=${path.basename(k6JsonFile)}
test.duration=${duration.toFixed(2)}s
total.requests=${httpReqs.count || 0}
error.rate=${(errorRate * 100).toFixed(2)}%
avg.response.time=${metrics.http_req_duration ? (metrics.http_req_duration.values.avg || 0).toFixed(2) + 'ms' : 'N/A'}
p95.response.time=${metrics.http_req_duration ? (metrics.http_req_duration.values['p(95)'] || 0).toFixed(2) + 'ms' : 'N/A'}
`;

const envPropsFile = path.join(outputDir, 'environment.properties');
if (fs.existsSync(envPropsFile)) {
  // Append to existing file
  fs.appendFileSync(envPropsFile, '\n' + envProps);
} else {
  fs.writeFileSync(envPropsFile, envProps, 'utf8');
}

console.log(`✅ Converted k6 results to Allure format`);
console.log(`   Input: ${k6JsonFile}`);
console.log(`   Output: ${allureXmlFile}`);
console.log(`   Status: ${overallStatus.toUpperCase()}`);
console.log(`   Requests: ${httpReqs.count || 0} (${passedCount} passed, ${failedCount} failed)`);
console.log(`\n💡 To generate Allure report:`);
console.log(`   npm run allure:generate`);
console.log(`   npm run allure:open`);

