import { Builder, WebDriver, Capabilities } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

export const getBaseUrl = (): string => {
  return process.env.WEB_BASE_URL || 'http://localhost:5173';
};

export const createDriver = async (): Promise<WebDriver> => {
  const options = new chrome.Options();
  
  // Run headless by default unless HEADFUL=true
  if (process.env.HEADFUL !== 'true') {
    options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');
  }
  
  options.addArguments('--window-size=1920,1080');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  return driver;
};

export const setAuthToken = async (driver: WebDriver, token: string): Promise<void> => {
  await driver.executeScript(
    `localStorage.setItem('access_token', arguments[0]);`,
    token
  );
};

export const waitForPageLoad = async (driver: WebDriver): Promise<void> => {
  await driver.wait(async () => {
    const state = await driver.executeScript('return document.readyState');
    return state === 'complete';
  }, 10000);
};

export const waitForElement = async (
  driver: WebDriver,
  selector: () => Promise<any>,
  timeout: number = 10000
): Promise<any> => {
  const startTime = Date.now();
  let element;
  
  while (Date.now() - startTime < timeout) {
    try {
      element = await selector();
      if (element) return element;
    } catch (e) {
      // Continue trying
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error(`Element not found within ${timeout}ms`);
};

