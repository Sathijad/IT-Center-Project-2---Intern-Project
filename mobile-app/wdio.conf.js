const path = require('path');

const APPIUM_PORT = Number(process.env.APPIUM_PORT || 4723);
const APPIUM_COMMAND = process.platform === 'win32' ? 'appium.cmd' : 'appium';

// Get absolute path to APK
const APK_PATH = process.env.APPIUM_APP || 
  path.resolve(__dirname, './build/app/outputs/flutter-apk/app-debug.apk');

const services = process.env.NO_APPIUM_SERVICE
    ? []
    : [[
        '@wdio/appium-service',
        {
            command: APPIUM_COMMAND,
            args: {
                basePath: '/wd/hub',
                port: APPIUM_PORT,
            },
            waitStartTime: 5000,
            waitStartTimeout: 180000,
        }
    ]];

exports.config = {
    runner: 'local',
    port: APPIUM_PORT,
    path: '/wd/hub',
    
    specs: ['./tests/mobile/**/*.spec.ts'],
    exclude: [],
    maxInstances: 1,
    
    capabilities: [{
        platformName: 'Android',
        // Override via env: APPIUM_DEVICE, APPIUM_APP, APPIUM_PLATFORM_VERSION, FLUTTER_SYS_PORT, DART_OBSERVATORY_URI
        'appium:deviceName': process.env.APPIUM_DEVICE || 'emulator-5554',
        'appium:app': APK_PATH,
        'appium:platformVersion': process.env.APPIUM_PLATFORM_VERSION || '13.0',
        'appium:automationName': 'Flutter',
        // Use dartObservatoryUri if provided (from flutter run output), otherwise use flutterSystemPort
        // Note: dartObservatoryUri should be in WebSocket format: ws://127.0.0.1:PORT/PATH=/ws
        ...(process.env.DART_OBSERVATORY_URI 
            ? { 'appium:dartObservatoryUri': process.env.DART_OBSERVATORY_URI.startsWith('ws://') 
                ? process.env.DART_OBSERVATORY_URI 
                : process.env.DART_OBSERVATORY_URI.replace('http://', 'ws://').replace(/\/$/, '') + '/ws' }
            : { 'appium:flutterSystemPort': +(process.env.FLUTTER_SYS_PORT || 4724) }
        ),
        'appium:newCommandTimeout': 300,
        'appium:autoGrantPermissions': true,
        // Set noReset to false for debugging to always start fresh (app will be reinstalled)
        // Set to true to keep app state between test runs (faster but may have stale state)
        'appium:noReset': true,
        'appium:driver': 'flutter',
        // Optional timeouts (uncomment if you hit slow boot issues)
        // 'appium:flutterServerLaunchTimeout': 60000,
        // 'appium:uiautomator2ServerInstallTimeout': 180000,
        // 'appium:uiautomator2ServerLaunchTimeout': 180000,
        // 'appium:adbExecTimeout': 180000,
    }],
    
    logLevel: 'info',
    bail: 0,
    waitforTimeout: 10000,
    connectionRetryTimeout: 180000,
    connectionRetryCount: 3,
    
    services,
    
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 180000, // give Flutter + Hosted UI flow time
        require: [require.resolve('ts-node/register/transpile-only')]
    },
    
    // Hooks
    onPrepare: async function() {
        // Kill any existing Appium processes on port 4723
        if (process.platform === 'win32') {
            try {
                const { execSync } = require('child_process');
                console.log('Checking for processes on port 4723...');
                try {
                    const result = execSync('netstat -ano | findstr :4723', { encoding: 'utf8', stdio: 'pipe' });
                    const lines = result.trim().split('\n');
                    for (const line of lines) {
                        const parts = line.trim().split(/\s+/);
                        const pid = parts[parts.length - 1];
                        if (pid && !isNaN(pid)) {
                            console.log(`Killing process on port 4723 (PID: ${pid})...`);
                            try {
                                execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
                            } catch (e) {
                                // Process might already be gone
                            }
                        }
                    }
                } catch (e) {
                    // No process found on port, that's fine
                }
                // Wait a bit for port to be released
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (e) {
                console.warn('Could not kill processes on port 4723:', e.message);
            }
        }
    },
};

