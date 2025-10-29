import { WebDriver, By, until } from 'selenium-webdriver';
import { getBaseUrl } from '../helpers/test-base.js';

export class DashboardPage {
  constructor(private driver: WebDriver) {}

  async open(): Promise<void> {
    const baseUrl = getBaseUrl();
    await this.driver.get(baseUrl);
    
    // Wait for the dashboard to load
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Dashboard')]")),
      10000
    );
  }

  async getUserEmail(): Promise<string> {
    const emailElement = await this.driver.wait(
      until.elementLocated(By.xpath("//div[contains(@class, 'flex-1')]//p[contains(@class, 'text-xs')]")),
      10000
    );
    return await emailElement.getText();
  }

  async getUserDisplayName(): Promise<string> {
    try {
      const nameElement = await this.driver.findElement(
        By.xpath("//div[contains(@class, 'flex-1')]//p[contains(@class, 'text-sm font-medium')]")
      );
      return await nameElement.getText();
    } catch {
      return '';
    }
  }

  async isAvatarVisible(): Promise<boolean> {
    try {
      // Look for the avatar (initials in a circle)
      const avatar = await this.driver.findElement(By.css('div[class*="rounded-full"]'));
      return await avatar.isDisplayed();
    } catch {
      return false;
    }
  }

  async isWelcomeMessageVisible(): Promise<boolean> {
    try {
      const welcomeMsg = await this.driver.findElement(
        By.xpath("//p[contains(text(), 'Welcome back')]")
      );
      return await welcomeMsg.isDisplayed();
    } catch {
      return false;
    }
  }

  async getCurrentUrl(): Promise<string> {
    return await this.driver.getCurrentUrl();
  }
}

