import { remote, RemoteOptions } from 'webdriverio';

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
  'appium:appPackage': 'com.example.itcenter_auth', // CRITICAL FIX: Correct package name
  'appium:appActivity': '.MainActivity',
};

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
  return driver;
}

// Create a finder object for Flutter driver
function createFinder(key: string) {
  return { finderType: 'ValueKey', keyValue: key };
}

export async function findElementByKey(
  driver: WebdriverIO.Browser,
  key: string,
  timeout: number = 30000
): Promise<WebdriverIO.Element> {
  const finder = createFinder(key);
  // Use flutter:findBy command
  const element = await driver.execute('flutter:findBy', finder);
  return element as WebdriverIO.Element;
}

export async function tapElement(
  driver: WebdriverIO.Browser,
  element: WebdriverIO.Element | string | { finderType: string; keyValue: string }
): Promise<void> {
  let finder: any;
  if (typeof element === 'string') {
    finder = createFinder(element);
  } else if (element && typeof element === 'object' && 'finderType' in element) {
    finder = element;
  } else {
    // If it's an element, extract the finder or use click
    try {
      await (element as WebdriverIO.Element).click();
      return;
    } catch (e) {
      throw new Error('Cannot tap element - provide key string or finder object');
    }
  }
  
  // Use flutter:tap command
  await driver.execute('flutter:tap', finder);
}

export async function enterText(
  driver: WebdriverIO.Browser,
  element: WebdriverIO.Element | string | { finderType: string; keyValue: string },
  text: string
): Promise<void> {
  let finder: any;
  if (typeof element === 'string') {
    finder = createFinder(element);
  } else if (element && typeof element === 'object' && 'finderType' in element) {
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
  
  // Tap first to focus
  await driver.execute('flutter:tap', finder);
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Use flutter:enterText command
  await driver.execute('flutter:enterText', { finder, text });
}

export async function getText(
  driver: WebdriverIO.Browser,
  element: WebdriverIO.Element | string | { finderType: string; keyValue: string }
): Promise<string> {
  let finder: any;
  if (typeof element === 'string') {
    finder = createFinder(element);
  } else if (element && typeof element === 'object' && 'finderType' in element) {
    finder = element;
  } else {
    // Try standard getText
    try {
      return await (element as WebdriverIO.Element).getText();
    } catch (e) {
      throw new Error('Cannot get text - provide key string or finder object');
    }
  }
  
  // Use flutter:getText command
  return await driver.execute('flutter:getText', finder) as string;
}

export async function waitForElement(
  driver: WebdriverIO.Browser,
  key: string,
  timeout: number = 30000
): Promise<WebdriverIO.Element> {
  const finder = createFinder(key);
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      // Use flutter:waitFor command
      await driver.execute('flutter:waitFor', { finder, timeout: timeout });
      // After waiting, find the element
      const element = await findElementByKey(driver, key, 5000);
      return element;
    } catch (e) {
      // Continue waiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  throw new Error(`Element with key "${key}" not found within ${timeout}ms`);
}

export async function waitForElementText(
  driver: WebdriverIO.Browser,
  key: string,
  expectedText: string,
  timeout: number = 30000
): Promise<WebdriverIO.Element> {
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

