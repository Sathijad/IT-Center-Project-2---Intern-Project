import { WebDriver, By, until } from 'selenium-webdriver';
import { getBaseUrl } from '../helpers/test-base';

export class LoginPage {
  constructor(private driver: WebDriver) {}

  async open(): Promise<void> {
    const baseUrl = getBaseUrl();
    await this.driver.get(`${baseUrl}/login`);
    await this.driver.wait(until.titleContains('IT Center'), 10000);
  }

  async clickSignInWithCognito(): Promise<void> {
    const signInButton = await this.driver.wait(
      until.elementLocated(By.xpath("//button[contains(text(), 'Sign in with Cognito')]")),
      10000
    );
    await signInButton.click();
  }

  async waitForRedirect(): Promise<void> {
    // Wait for redirect to Cognito (or mock in local dev)
    // In local development, you might be bypassing the redirect
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async isDisplayed(): Promise<boolean> {
    try {
      const signInButton = await this.driver.findElement(
        By.xpath("//button[contains(text(), 'Sign in with Cognito')]")
      );
      return await signInButton.isDisplayed();
    } catch {
      return false;
    }
  }
}

