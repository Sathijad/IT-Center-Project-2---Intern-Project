// This config is for running a SINGLE test file
// Usage: npx wdio run wdio.single.conf.js --spec ./test/specs/kpi_list_test.js

exports.config = {
    runner: "local",
    port: 4723,
    
    // Empty specs - we'll pass via command line
    specs: [],
    
    maxInstances: 1,
    
    capabilities: [
      {
        platformName: "Android",
        "appium:deviceName": "emulator-5554",
        "appium:app":
          "C:/Users/SathijaDeshapriya/Downloads/IT Center Project 2/mobile-app/build/app/outputs/flutter-apk/app-debug.apk",
        "appium:platformVersion": "13",
        "appium:automationName": "UiAutomator2",
        "appium:newCommandTimeout": 300,
        "appium:autoGrantPermissions": true,
        "appium:noReset": false,
        "appium:unicodeKeyboard": true,
        "appium:resetKeyboard": true,
        "appium:waitForIdleTimeout": 1000,
      },
    ],
  
    logLevel: "info",
    bail: 0,
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    
    services: [
        [
            "appium",
            {
                command: "appium",
                args: {
                    relaxedSecurity: true,
                },
                env: {
                    APPIUM_HOME: process.cwd(),
                },
            },
        ],
    ],
    
    onPrepare: function (config, capabilities) {
      // Set APPIUM_HOME to current directory so Appium can find locally installed drivers
      process.env.APPIUM_HOME = process.cwd();
    },
    framework: "mocha",
    
    reporters: ["spec"],
    
    mochaOpts: {
      ui: "bdd",
      timeout: 60000,
    },
  };
  