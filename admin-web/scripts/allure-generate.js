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
  console.log('Generating Allure report...');
  console.log(`Results directory: ${resultsDir}`);
  console.log(`Report directory: ${reportDir}`);
  
  // Use PowerShell on Windows with full path to allure.cmd
  const isWindows = process.platform === 'win32';
  let command;
  
  if (isWindows) {
    // Use the known path to allure.cmd in npm's global directory
    const allurePath = `${process.env.APPDATA}\\npm\\allure.cmd`;
    // Escape single quotes for PowerShell (double them)
    const escapeForPS = (path) => path.replace(/'/g, "''");
    // Change to the project directory first, then run allure with relative paths to avoid path parsing issues
    const psCommand = `cd '${escapeForPS(projectRoot)}'; & '${escapeForPS(allurePath)}' generate './allure-results' --clean -o './allure-report'`;
    command = `powershell -NoProfile -Command "${psCommand}"`;
  } else {
    command = `allure generate "${resultsDir}" --clean -o "${reportDir}"`;
  }
  
  execSync(command, {
    stdio: 'inherit',
    cwd: projectRoot,
    shell: true,
    env: { ...process.env },
  });
  
  console.log('Allure report generated successfully!');
} catch (error) {
  console.error('Failed to generate Allure report:', error.message);
  process.exit(1);
}

