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
      "appium:waitForIdleTimeout": 0,
      "appium:androidInstallTimeout": 90000,
      "appium:uiautomator2ServerLaunchTimeout": 60000,
    },
  ],

  logLevel: "info",
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  
  services: ["appium"],
  framework: "mocha",
  
  reporters: ["spec"],
  
  mochaOpts: {
    ui: "bdd",
    timeout: 60000,
  },
};
