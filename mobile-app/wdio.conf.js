const path = require('path');
require('dotenv').config();

const ANDROID_APP_PATH =
  process.env.ANDROID_APP_PATH ||
  path.resolve(__dirname, './build/app/outputs/flutter-apk/app-debug.apk');

exports.config = {
  runner: 'local',
  specs: ['./tests/specs/**/*.e2e.js'],
  maxInstances: 1,
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 180000,
  },
  logLevel: 'info',
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 1,
  hostname: '127.0.0.1',
  port: 4723,
  path: '/',
  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'Flutter',
      'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'emulator-5554',
      'appium:platformVersion': process.env.ANDROID_PLATFORM_VERSION || '13',
      'appium:app': ANDROID_APP_PATH,
      'appium:newCommandTimeout': 300,
      'appium:autoGrantPermissions': true,
      'appium:noReset': process.env.ANDROID_NO_RESET === 'true',
    },
  ],
};

