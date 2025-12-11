exports.config = {
  runner: 'local',
  specs: ['./test/specs/**/*.spec.js'],
  exclude: [],
    maxInstances: 1,
    capabilities: [
      {
      platformName: 'Android',
      'appium:deviceName': 'emulator-5554',
      'appium:app': 'C:/Users/SathijaDeshapriya/Downloads/IT Center Project 2/mobile-app/build/app/outputs/flutter-apk/app-debug.apk',
      'appium:automationName': 'UiAutomator2',
      'appium:platformVersion': '13',
      'appium:newCommandTimeout': 300,
      'appium:autoGrantPermissions': true,
      'appium:noReset': false,
      'appium:waitForIdleTimeout': 0,
      'appium:androidInstallTimeout': 90000,
      'appium:uiautomator2ServerLaunchTimeout': 60000,
    },
  ],
  logLevel: 'info',
    bail: 0,
  baseUrl: 'http://127.0.0.1:4723',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
  services: [
    [
      'appium',
      {
        args: {
          address: '127.0.0.1',
          port: 4723,
          relaxedSecurity: true,
          log: './logs/appium.log',
        },
        logPath: './logs',
        waitStartTime: 120000, // Increased to 120 seconds for slower systems
        command: 'appium',
        // Don't start Appium if it's already running
        skipSpawn: false,
      },
    ],
  ],
  framework: 'mocha',
  reporters: ['spec'],
    mochaOpts: {
    ui: 'bdd',
    timeout: 180000,
  },
};

