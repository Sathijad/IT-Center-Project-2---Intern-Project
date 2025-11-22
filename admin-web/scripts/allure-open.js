import { execSync } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const resultsDir = resolve(projectRoot, 'allure-results');
const reportDir = resolve(projectRoot, 'allure-report');

try {
  console.log('Starting Allure report server...');
  console.log('The report will open in your browser automatically.');
  console.log('Press Ctrl+C to stop the server.\n');
  
  // Use allure serve instead of open - this starts a local web server
  // which properly serves the report and avoids browser CORS issues
  const isWindows = process.platform === 'win32';
  let command;
  
  if (isWindows) {
    // Use the known path to allure.cmd in npm's global directory
    const allurePath = `${process.env.APPDATA}\\npm\\allure.cmd`;
    // Escape single quotes for PowerShell (double them)
    const escapeForPS = (path) => path.replace(/'/g, "''");
    // Use allure serve with results directory - it will generate and serve the report
    // Change to project directory first to avoid path issues
    const psCommand = `cd '${escapeForPS(projectRoot)}'; & '${escapeForPS(allurePath)}' serve './allure-results'`;
    command = `powershell -NoProfile -Command "${psCommand}"`;
  } else {
    command = `allure serve "${resultsDir}"`;
  }
  
  // Note: This will block until the server is stopped (Ctrl+C)
  execSync(command, {
    stdio: 'inherit',
    cwd: projectRoot,
    shell: true,
    env: { ...process.env },
  });
} catch (error) {
  // If serve fails, try opening the generated report
  console.log('Serve failed, trying to open generated report...');
  try {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      execSync(`start "" "${reportDir}\\index.html"`, {
        stdio: 'inherit',
        cwd: projectRoot,
        shell: true,
      });
    } else {
      execSync(`open "${reportDir}"`, {
        stdio: 'inherit',
        cwd: projectRoot,
        shell: true,
      });
    }
  } catch (fallbackError) {
    console.error('Failed to open Allure report:', error.message);
    console.log(`\nYou can manually serve the report with: allure serve allure-results`);
    console.log(`Or open the HTML file at: ${reportDir}\\index.html`);
    process.exit(1);
  }
}
