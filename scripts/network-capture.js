#!/usr/bin/env node

/**
 * Network Capture Script
 * 
 * Automatically captures network traffic during test execution using TShark.
 * This script:
 * 1. Starts TShark capture before tests
 * 2. Runs the specified test command
 * 3. Stops TShark after tests complete
 * 4. Saves capture with timestamp
 * 
 * Usage:
 *   node scripts/network-capture.js
 *   node scripts/network-capture.js --interface 2
 *   node scripts/network-capture.js --test-command "npm test"
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Default interface (adjust based on 'tshark -D' output)
  INTERFACE: '10', // Using loopback adapter (Windows)
  
  // Capture filter to reduce file size (only traffic on port 8080)
  CAPTURE_FILTER: 'tcp port 8080',
  
  // Output directory for capture files
  OUTPUT_DIR: path.join(__dirname, '..', 'captures'),
  
  // Default test command
  DEFAULT_TEST_COMMAND: 'cd admin-web && npm run ui:test',
  
  // Number of seconds to wait for TShark to initialize
  TSHARK_STARTUP_DELAY: 2000,
  
  // Common TShark locations (Windows)
  TSHARK_PATHS: [
    'C:\\Program Files\\Wireshark\\tshark.exe',
    'C:\\Program Files (x86)\\Wireshark\\tshark.exe',
  ],
};

// Find TShark executable
function findTShark() {
  // Try 'tshark' command first (if in PATH)
  return new Promise((resolve, reject) => {
    exec('tshark --version', (error) => {
      if (!error) {
        resolve('tshark');
        return;
      }
      
      // Try common Windows installation paths
      const tsharkPath = CONFIG.TSHARK_PATHS.find(p => fs.existsSync(p));
      
      if (tsharkPath) {
        resolve(`"${tsharkPath}"`);
      } else {
        reject(new Error('TShark not found in PATH or standard locations'));
      }
    });
  });
}

// Parse command-line arguments
const args = process.argv.slice(2);
let testCommand = process.env.TEST_COMMAND || CONFIG.DEFAULT_TEST_COMMAND;
let interface = CONFIG.INTERFACE;

args.forEach((arg, index) => {
  if (arg === '--interface' && args[index + 1]) {
    interface = args[index + 1];
  } else if (arg === '--test-command' && args[index + 1]) {
    testCommand = args[index + 1];
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Network Capture Script

Automatically captures network traffic during test execution.

Usage:
  node scripts/network-capture.js [options]

Options:
  --interface <num>      Network interface number (default: 1)
                         Use 'tshark -D' to list interfaces
  
  --test-command <cmd>   Custom test command (default: cd admin-web && npm run ui:test)
                         Or set TEST_COMMAND environment variable

Environment Variables:
  TEST_COMMAND           Test command to execute (overrides --test-command)

Examples:
  # Capture during E2E tests
  node scripts/network-capture.js
  
  # Capture with custom interface
  node scripts/network-capture.js --interface 2
  
  # Capture during custom tests
  $env:TEST_COMMAND="cd mobile-app && flutter test"; node scripts/network-capture.js

Output:
  Capture files are saved to: ${CONFIG.OUTPUT_DIR}
`);
    process.exit(0);
  }
});

// Create output directory if it doesn't exist
if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
  fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  console.log(`Created directory: ${CONFIG.OUTPUT_DIR}`);
}

// Generate timestamped filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const captureFile = path.join(CONFIG.OUTPUT_DIR, `api_capture_${timestamp}.pcapng`);

console.log('🚀 Network Capture Script');
console.log('═'.repeat(60));
console.log(`Interface:    ${interface}`);
console.log(`Filter:       ${CONFIG.CAPTURE_FILTER}`);
console.log(`Test command: ${testCommand}`);
console.log(`Output file:  ${captureFile}`);
console.log('═'.repeat(60));
console.log('');

// Variable to store TShark command
let tsharkCommand = 'tshark';

// Check if TShark is available and find it
function checkTShark() {
  return findTShark()
    .then((command) => {
      tsharkCommand = command;
      console.log(`✅ Found TShark: ${command}`);
      console.log('');
    })
    .catch((error) => {
      console.error('❌ TShark not found. Please install Wireshark.');
      console.error('');
      console.error('Download from: https://www.wireshark.org/download.html');
      console.error('');
      console.error('If Wireshark is installed but not found:');
      console.error('  1. Add Wireshark to your PATH environment variable');
      console.error('  2. Or install Wireshark to default location: C:\\Program Files\\Wireshark\\');
      console.error('');
      throw error;
    });
}

// Start TShark capture
function startCapture() {
  return new Promise((resolve, reject) => {
    console.log('📡 Starting TShark capture...');
    
    const tsharkProcess = spawn(tsharkCommand, [
      '-i', interface,
      '-f', CONFIG.CAPTURE_FILTER,
      '-w', captureFile,
      '-P', // Don't print packet output to console
      '-q', // Quiet mode
    ], {
      stdio: 'pipe',
      shell: true,
    });

    // Wait for TShark to initialize
    setTimeout(() => {
      console.log('✅ Capture started successfully');
      console.log('');
      resolve(tsharkProcess);
    }, CONFIG.TSHARK_STARTUP_DELAY);

    tsharkProcess.on('error', (error) => {
      console.error('❌ Failed to start TShark:', error.message);
      console.error('');
      console.error('Possible issues:');
      console.error('  - TShark not installed or not in PATH');
      console.error('  - Insufficient permissions (run as Administrator on Windows)');
      console.error('  - Invalid interface number');
      console.error('');
      console.error('Help:');
      console.error('  - Run "tshark -D" to list available interfaces');
      console.error('  - Run PowerShell as Administrator on Windows');
      reject(error);
    });
  });
}

// Stop TShark capture
function stopCapture(tsharkProcess) {
  return new Promise((resolve) => {
    console.log('');
    console.log('⏹️  Stopping TShark capture...');
    
    tsharkProcess.kill('SIGINT');
    
    // Wait for graceful shutdown
    setTimeout(() => {
      if (!tsharkProcess.killed) {
        tsharkProcess.kill('SIGKILL');
      }
      console.log('✅ Capture stopped');
      resolve();
    }, 1000);
  });
}

// Run test command
function runTests() {
  return new Promise((resolve, reject) => {
    console.log('🧪 Running tests...');
    console.log('');
    
    const [command, ...args] = testCommand.split(' ');
    const testProcess = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('');
        console.log('✅ Tests completed successfully');
        resolve();
      } else {
        console.log('');
        console.log(`⚠️  Tests exited with code ${code}`);
        resolve(); // Still resolve to allow capture to be saved
      }
    });

    testProcess.on('error', (error) => {
      console.error('❌ Failed to run tests:', error.message);
      reject(error);
    });
  });
}

// Get capture file stats
function getCaptureStats(filePath) {
  return new Promise((resolve) => {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        resolve(null);
      } else {
        resolve({
          size: stats.size,
          sizeMB: (stats.size / 1024 / 1024).toFixed(2),
        });
      }
    });
  });
}

// Main execution
async function main() {
  try {
    // Check prerequisites
    await checkTShark();
    
    // Start capture
    const tsharkProcess = await startCapture();
    
    // Run tests
    await runTests();
    
    // Stop capture
    await stopCapture(tsharkProcess);
    
    // Display results
    console.log('');
    console.log('📊 Capture Summary');
    console.log('═'.repeat(60));
    
    const stats = await getCaptureStats(captureFile);
    if (stats) {
      console.log(`File: ${path.basename(captureFile)}`);
      console.log(`Size: ${stats.sizeMB} MB (${stats.size} bytes)`);
    } else {
      console.log('⚠️  Could not read capture file stats');
    }
    
    console.log('');
    console.log('📝 Next Steps:');
    console.log('  1. Open capture in Wireshark:');
    console.log(`     wireshark "${captureFile}"`);
    console.log('');
    console.log('  2. Apply display filters (see docs/WIRESHARK_FILTERS.md)');
    console.log('     - Authorization headers: http.request.line contains "Authorization"');
    console.log('     - HTTP errors: http.response.code >= 400');
    console.log('     - TLS traffic: tls');
    console.log('');
    console.log('  3. Review network-capture.md for analysis guide');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    process.exit(1);
  }
}

// Handle process interruption
process.on('SIGINT', () => {
  console.log('');
  console.log('⚠️  Received SIGINT, cleaning up...');
  process.exit(130); // Standard exit code for SIGINT
});

// Run main function
main();

