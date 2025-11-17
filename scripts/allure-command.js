#!/usr/bin/env node

/**
 * Cross-platform wrapper for Allure commands
 * Handles paths with spaces correctly
 * Usage: node scripts/allure-command.js <command> [args...]
 */

const { execSync, exec } = require('child_process');
const path = require('path');

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error('Usage: node scripts/allure-command.js <command> [args...]');
  console.error('Commands: generate, open, serve');
  process.exit(1);
}

// Keep paths as-is if they're relative, only resolve if needed
// This avoids creating absolute paths with spaces on Windows
const resolvePath = (p) => {
  // If it's already a relative path, keep it relative
  if (!path.isAbsolute(p)) {
    return p;
  }
  // Only resolve absolute paths if necessary
  // For now, just return as-is to avoid space issues
  return p;
};

// Quote paths that might contain spaces
const quotePath = (p) => {
  if (p.includes(' ')) {
    return `"${p}"`;
  }
  return p;
};

// Build command array directly (no string concatenation)
// On Windows, try to find allure.cmd explicitly to avoid PATH issues
let cmd = 'allure';
let cmdArgs = [];

if (process.platform === 'win32') {
  // Try to find allure.cmd using where.exe to get a path without spaces
  try {
    const { execSync: syncExec } = require('child_process');
    const whereOutput = syncExec('where.exe allure.cmd', { encoding: 'utf-8', stdio: 'pipe' });
    const paths = whereOutput.trim().split('\n').map(p => p.trim()).filter(p => p);
    // Prefer paths without spaces (like AppData\Roaming\npm)
    const pathWithoutSpaces = paths.find(p => !p.includes(' ') || !p.includes('IT Center'));
    if (pathWithoutSpaces) {
      cmd = pathWithoutSpaces;
    } else if (paths[0]) {
      cmd = paths[0];
    }
  } catch (e) {
    // If where.exe fails, fall back to 'allure'
    // This might still work if allure is in PATH
  }
}

switch (command) {
  case 'generate':
    if (args.length < 2) {
      console.error('Usage: generate <results-dir> <report-dir>');
      process.exit(1);
    }
    // Keep paths relative to avoid Windows space issues
    const resultsDir = args[0];
    const reportDir = args[1];
    cmdArgs = ['generate', resultsDir, '--clean', '-o', reportDir];
    break;

  case 'open':
    if (args.length < 1) {
      console.error('Usage: open <report-dir>');
      process.exit(1);
    }
    // Keep paths relative
    const reportPath = args[0];
    cmdArgs = ['open', reportPath];
    break;

  case 'serve':
    if (args.length < 1) {
      console.error('Usage: serve <results-dir>');
      process.exit(1);
    }
    // Keep paths relative
    const servePath = args[0];
    cmdArgs = ['serve', servePath];
    break;

  default:
    console.error(`Unknown command: ${command}`);
    console.error('Available commands: generate, open, serve');
    process.exit(1);
}

try {
  // On Windows, allure is a .bat file, so we need shell: true
  // But we'll use execSync with proper quoting to handle paths with spaces
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    // On Windows, use exec instead of spawn for better batch file handling
    // Quote the command itself if it contains spaces
    let quotedCmd = cmd;
    if (cmd.includes(' ')) {
      quotedCmd = `"${cmd}"`;
    }
    
    // Quote arguments that contain spaces
    const quotedArgs = cmdArgs.map(arg => {
      if (arg.includes(' ') || arg.includes('&') || arg.includes('|')) {
        // Escape special characters and quote
        return `"${arg.replace(/"/g, '\\"')}"`;
      }
      return arg;
    });
    
    // Build the full command string with quoted command
    const commandStr = `${quotedCmd} ${quotedArgs.join(' ')}`;
    
    // Use exec which handles Windows batch files better
    exec(commandStr, {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    }, (error, stdout, stderr) => {
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      
      if (error) {
        console.error(`\nFailed to execute: ${commandStr}`);
        if (error.code === 'ENOENT') {
          console.error('\n💡 Allure commandline is not installed or not in PATH.');
          console.error('   Please install Allure: https://docs.qameta.io/allure/#_get_started');
        } else {
          console.error(error.message);
        }
        process.exit(1);
      } else {
        process.exit(0);
      }
    });
  } else {
    // On Unix-like systems, use spawn with argument array
    const { spawn } = require('child_process');
    
    const child = spawn(cmd, cmdArgs, {
      stdio: 'inherit',
      shell: false,
      cwd: process.cwd()
    });
    
    child.on('error', (error) => {
      console.error(`Failed to execute: ${cmd} ${cmdArgs.join(' ')}`);
      console.error(error.message);
      if (error.code === 'ENOENT') {
        console.error('\n💡 Allure commandline is not installed or not in PATH.');
        console.error('   Please install Allure: https://docs.qameta.io/allure/#_get_started');
      }
      process.exit(1);
    });
    
    child.on('exit', (code) => {
      process.exit(code || 0);
    });
  }
} catch (error) {
  console.error(`Failed to execute: ${cmd} ${cmdArgs.join(' ')}`);
  console.error(error.message);
  if (error.code === 'ENOENT') {
    console.error('\n💡 Allure commandline is not installed or not in PATH.');
    console.error('   Please install Allure: https://docs.qameta.io/allure/#_get_started');
  }
  process.exit(1);
}

