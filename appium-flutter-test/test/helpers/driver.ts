import type { Element as FlutterElement } from 'webdriverio';
import { byValueKey } from 'appium-flutter-finder';

type Driver = WebdriverIO.Browser;
const asFlutter = (driver: Driver) => driver as unknown as any;

export async function waitForElement(
  driver: Driver,
  key: string,
  timeoutMs = 30000,
): Promise<string> {
  const finder = byValueKey(key);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const remaining = deadline - Date.now();
      const perAttemptTimeout = remaining < 0 ? 0 : Math.min(remaining, 2000);
      // @ts-ignore - Flutter execute signature not in WDIO types
      await asFlutter(driver).execute('flutter:waitFor', finder, perAttemptTimeout);
      return finder;
    } catch {
      await driver.pause(500);
    }
  }

  throw new Error(`Element with key "${key}" not found within ${timeoutMs}ms`);
}

export async function tapElement(
  driver: Driver,
  target: FlutterElement | string,
): Promise<void> {
  if (typeof target === 'string') {
    // @ts-ignore - Flutter execute signature not in WDIO types
    await asFlutter(driver).execute('flutter:clickElement', byValueKey(target));
    return;
  }

  await (target as FlutterElement).click();
}

export async function enterText(
  driver: Driver,
  target: FlutterElement | string,
  value: string,
): Promise<void> {
  if (typeof target !== 'string') {
    await (target as FlutterElement).clearValue();
    await (target as FlutterElement).setValue(value);
    return;
  }

  const finder = byValueKey(target);
  // @ts-ignore - Flutter execute signature not in WDIO types
  await asFlutter(driver).execute('flutter:clickElement', finder);
  await driver.pause(400);
  // Clear current value by sending empty text to the focused field
  // @ts-ignore - Flutter execute signature not in WDIO types
  await asFlutter(driver).execute('flutter:enterText', '');
  await driver.pause(200);
  // @ts-ignore - Flutter execute signature not in WDIO types
  await asFlutter(driver).execute('flutter:enterText', value);
}

export async function checkSnackbar(
  driver: Driver,
  expectedText: string,
  timeoutMs = 10000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const elements = await driver.$$('*');
    for (const element of elements) {
      try {
        const text = await element.getText();
        if (text?.includes(expectedText)) {
          return true;
        }
      } catch {
        // ignore lookup failures
      }
    }
    await driver.pause(400);
  }

  return false;
}

export async function findWebElementAny(
  driver: Driver,
  selectors: string[],
  timeoutMs = 15000,
): Promise<WebdriverIO.Element> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const selector of selectors) {
      const element = await driver.$(selector);
      if (await element.isExisting()) {
        return element as unknown as WebdriverIO.Element;
      }
    }
    await driver.pause(300);
  }

  throw new Error(`No selectors matched: ${selectors.join(', ')}`);
}

export async function waitForWebView(
  driver: Driver,
  timeoutMs = 30000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    // @ts-ignore - Flutter driver exposes getContexts
    const contexts = await asFlutter(driver).getContexts();
    const webview = contexts.find((context: string) => context.includes('WEBVIEW'));
    if (webview) {
      return webview;
    }
    await driver.pause(500);
  }

  throw new Error('WEBVIEW context not found');
}

export async function switchToWebView(driver: Driver): Promise<void> {
  const webview = await waitForWebView(driver);
  // @ts-ignore - Flutter driver exposes switchContext
  await asFlutter(driver).switchContext(webview);
}

export async function switchToFlutter(driver: Driver): Promise<void> {
  // @ts-ignore - Flutter driver exposes switchContext
  await asFlutter(driver).switchContext('FLUTTER');
}

