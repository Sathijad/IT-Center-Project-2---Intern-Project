import { remote, RemoteOptions } from 'webdriverio';
import { byValueKey } from 'appium-flutter-finder';

export interface AppiumCapabilities {
  platformName: string;
  deviceName?: string;
  app?: string;
  automationName?: string;
  [key: string]: any;
}

const DEFAULT_CAPABILITIES: AppiumCapabilities = {
  platformName: 'Android',
  'appium:deviceName': 'Android Emulator',
  'appium:app': './build/app/outputs/flutter-apk/app-debug.apk',
  'appium:automationName': 'Flutter',
  'appium:appPackage': 'com.example.itcenter_auth',
  'appium:appActivity': '.MainActivity',
};

/**
 * Wait for Flutter app to be ready (first frame rendered)
 */
export async function waitForFlutterReady(driver: WebdriverIO.Browser, timeout: number = 30000): Promise<void> {
  const startTime = Date.now();
  console.log('⏳ Waiting for Flutter app to be ready...');
  
  while (Date.now() - startTime < timeout) {
    try {
      // Try to wait for first frame
      await driver.execute('flutter:waitForFirstFrame');
      console.log('✅ Flutter app is ready (first frame rendered)');
      // Give it a small additional delay to ensure everything is stable
      await new Promise(resolve => setTimeout(resolve, 1000));
      return;
    } catch (e: any) {
      const errorMsg = String(e?.message || e);
      // If it's a "No root widget" error, app is still starting - wait and retry
      if (errorMsg.includes('No root widget is attached') || 
          errorMsg.includes('root widget') ||
          errorMsg.includes('runApp')) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      // Other errors - might be that command doesn't exist, fallback to delay
      console.log('⚠️  waitForFirstFrame not available, using fallback delay...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return;
    }
  }
  
  // If we get here, timeout occurred but we'll continue anyway
  console.warn('⚠️  Flutter readiness check timed out, but continuing...');
  await new Promise(resolve => setTimeout(resolve, 3000));
}

export async function createDriver(customCapabilities?: Partial<AppiumCapabilities>) {
  const capabilities = { ...DEFAULT_CAPABILITIES, ...customCapabilities };
  
  const options: RemoteOptions = {
    hostname: 'localhost',
    port: 4723,
    path: '/wd/hub',
    capabilities,
    connectionRetryCount: 3,
    connectionRetryTimeout: 90000,
  };

  const driver = await remote(options);
  
  // Check Flutter driver connection
  try {
    await driver.execute('flutter:checkHealth');
    console.log('✅ Flutter driver connected successfully');
  } catch (e) {
    console.warn('⚠️  Flutter driver health check failed, but continuing...', e);
  }
  
  // Wait for Flutter app to be ready before returning
  await waitForFlutterReady(driver);
  
  return driver;
}

// Create a finder using appium-flutter-finder
function createFinder(key: string) {
  return byValueKey(key);
}

export async function findElementByKey(
  driver: WebdriverIO.Browser,
  key: string,
  timeout: number = 30000
): Promise<any> {
  const finder = createFinder(key);
  // Return the finder object for use with Flutter commands
  return finder;
}

export async function waitForElement(
  driver: WebdriverIO.Browser,
  key: string,
  timeout: number = 60000
): Promise<any> {
  const finder = createFinder(key);
  const startTime = Date.now();
  const pollInterval = 1000;
  
  while (Date.now() - startTime < timeout) {
    try {
      // Use flutter:waitFor command with the official finder
      await driver.execute('flutter:waitFor', finder);
      // If waitFor succeeds, element exists - return the finder for use with other commands
      return finder;
    } catch (e: any) {
      const errorMsg = String(e?.message || e);
      
      // Handle "No root widget is attached" - Flutter app not ready yet
      if (errorMsg.includes('No root widget is attached') || 
          errorMsg.includes('root widget') ||
          errorMsg.includes('runApp') ||
          errorMsg.includes('No root widget')) {
        // Flutter not ready yet - this is okay, just wait and retry
        console.log(`⏳ Flutter app not ready yet, waiting... (looking for: ${key})`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        continue;
      }
      
      // Handle timeout errors - element might not be found yet
      if (errorMsg.includes('timeout') || 
          errorMsg.includes('Timeout') ||
          errorMsg.includes('not found') || 
          errorMsg.includes('Element')) {
        // Element not found yet, continue waiting
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        continue;
      }
      
      // For other errors, log and retry (might be transient connection issues)
      console.log(`⚠️  Error waiting for element "${key}": ${errorMsg.substring(0, 100)}`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
  
  throw new Error(`Element with key "${key}" not found within ${timeout}ms`);
}

export async function tapElement(
  driver: WebdriverIO.Browser,
  element: WebdriverIO.Element | string | any
): Promise<void> {
  let finder: any;
  
  if (typeof element === 'string') {
    finder = createFinder(element);
  } else if (element && typeof element === 'object' && ('finderType' in element || 'serializedFinder' in element)) {
    // It's already a finder object (from appium-flutter-finder or our createFinder)
    finder = element;
  } else {
    // If it's a WebDriverIO element, try standard click
    try {
      await (element as WebdriverIO.Element).click();
      return;
    } catch (e) {
      throw new Error('Cannot tap element - provide key string or finder object');
    }
  }
  
  // Wait for element first
  try {
    await driver.execute('flutter:waitFor', finder);
  } catch (e) {
    throw new Error(`Element not found before tapping: ${e}`);
  }
  
  // Use flutter:tap command
  await driver.execute('flutter:tap', finder);
  await new Promise(resolve => setTimeout(resolve, 500));
}

export async function enterText(
  driver: WebdriverIO.Browser,
  element: WebdriverIO.Element | string | any,
  text: string
): Promise<void> {
  let finder: any;
  
  if (typeof element === 'string') {
    finder = createFinder(element);
  } else if (element && typeof element === 'object' && ('finderType' in element || 'serializedFinder' in element)) {
    // It's already a finder object
    finder = element;
  } else {
    // Try standard WebDriverIO text input
    try {
      await (element as WebdriverIO.Element).clearValue();
      await (element as WebdriverIO.Element).setValue(text);
      return;
    } catch (e) {
      throw new Error('Cannot enter text - provide key string or finder object');
    }
  }
  
  // Wait for element first
  try {
    await driver.execute('flutter:waitFor', finder);
  } catch (e) {
    throw new Error(`Element not found before entering text: ${e}`);
  }
  
  // Tap first to focus
  await driver.execute('flutter:tap', finder);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Use flutter:enterText command - format: { finder: {...}, text: "..." }
  await driver.execute('flutter:enterText', { finder, text });
  await new Promise(resolve => setTimeout(resolve, 500));
}

export async function getText(
  driver: WebdriverIO.Browser,
  element: WebdriverIO.Element | string | any
): Promise<string> {
  let finder: any;
  
  if (typeof element === 'string') {
    finder = createFinder(element);
  } else if (element && typeof element === 'object' && ('finderType' in element || 'serializedFinder' in element)) {
    // It's already a finder object
    finder = element;
  } else {
    // Try standard getText
    try {
      return await (element as WebdriverIO.Element).getText();
    } catch (e) {
      throw new Error('Cannot get text - provide key string or finder object');
    }
  }
  
  // Wait for element first
  try {
    await driver.execute('flutter:waitFor', finder);
  } catch (e) {
    throw new Error(`Element not found before getting text: ${e}`);
  }
  
  // Use flutter:getText command
  return await driver.execute('flutter:getText', finder) as string;
}

export async function waitForElementText(
  driver: WebdriverIO.Browser,
  key: string,
  expectedText: string,
  timeout: number = 30000
): Promise<any> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const element = await waitForElement(driver, key, 5000);
      const text = await getText(driver, key);
      if (text && text.includes(expectedText)) {
        return element;
      }
    } catch (e) {
      // Continue waiting
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Element with key ${key} did not contain text "${expectedText}" within ${timeout}ms`);
}

// Helper to check if snackbar/toast is visible
export async function checkSnackbar(
  driver: WebdriverIO.Browser,
  expectedText: string,
  timeout: number = 10000
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      // Try to find a snackbar by text (snackbars typically don't have ValueKeys)
      // We can use xpath or text search
      const elements = await driver.$$('*');
      for (const el of elements) {
        try {
          const text = await el.getText();
          if (text && text.includes(expectedText)) {
            return true;
          }
        } catch (e) {
          // Continue
        }
      }
    } catch (e) {
      // Continue waiting
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

// Helper to navigate to screen from home using ValueKey
export async function navigateToScreen(
  driver: WebdriverIO.Browser,
  cardKey: string,
  timeout: number = 30000
): Promise<void> {
  // Ensure we're on home screen
  await waitForElement(driver, 'dashboard_welcome_card', 10000);
  
  // Find and tap the card
  await waitForElement(driver, cardKey, timeout);
  await tapElement(driver, cardKey);
  
  // Wait for screen transition
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// Helper to enter verification code (when MFA is required)
export async function enterVerificationCode(
  driver: WebdriverIO.Browser,
  code: string,
  timeout: number = 30000
): Promise<void> {
  // Find verification code field
  // Note: May need to find by text or use Flutter finder
  // For now, we'll use a generic approach
  
  // Wait for code entry screen
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Enter code - this may require finding the text field differently
  // Since verification code fields may not have ValueKeys
  // We'll need to use text-based finding or Flutter semantics
  
  // Placeholder - actual implementation depends on app structure
  console.log('Verification code entry - may require manual intervention');
}
