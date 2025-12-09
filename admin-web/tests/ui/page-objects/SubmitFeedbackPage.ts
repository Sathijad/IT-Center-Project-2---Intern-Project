import { WebDriver, By, until } from 'selenium-webdriver';
import { getBaseUrl } from '../helpers/test-base.js';

export class SubmitFeedbackPage {
  constructor(private driver: WebDriver) {}

  async open(): Promise<void> {
    const baseUrl = getBaseUrl();
    await this.driver.get(`${baseUrl}/feedback/submit`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Submit Feedback')]")),
      15000
    );
  }

  async isDisplayed(): Promise<boolean> {
    try {
      const title = await this.driver.findElement(
        By.xpath("//h1[contains(text(), 'Submit Feedback')]")
      );
      return await title.isDisplayed();
    } catch {
      return false;
    }
  }

  async setTitle(title: string): Promise<void> {
    const input = await this.driver.findElement(By.id('feedback-title'));
    await input.clear();
    await input.sendKeys(title);
  }

  async setDescription(description: string): Promise<void> {
    const textarea = await this.driver.findElement(By.id('feedback-description'));
    await textarea.clear();
    await textarea.sendKeys(description);
  }

  async setCategory(category: string): Promise<void> {
    const input = await this.driver.findElement(By.id('feedback-category'));
    await input.clear();
    await input.sendKeys(category);
  }

  async setPriority(priority: string): Promise<void> {
    // Map priority values to option values (LOW, MEDIUM, HIGH, URGENT)
    const priorityMap: Record<string, string> = {
      'LOW': 'LOW',
      'MEDIUM': 'MEDIUM',
      'HIGH': 'HIGH',
      'URGENT': 'URGENT',
      'Low': 'LOW',
      'Medium': 'MEDIUM',
      'High': 'HIGH',
      'Urgent': 'URGENT',
    };
    
    const priorityValue = priorityMap[priority] || priority;
    const select = await this.driver.findElement(By.id('feedback-priority'));
    
    // Use JavaScript to set the value directly (more reliable than clicking)
    await this.driver.executeScript(
      `arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('change', { bubbles: true }));`,
      select,
      priorityValue
    );
    
    // Wait a bit for the change to register
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async clickSubmit(): Promise<void> {
    const button = await this.driver.findElement(
      By.xpath("//button[@type='submit' and contains(text(), 'Submit Feedback')]")
    );
    await button.click();
    // Wait for navigation after submit
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  async clickCancel(): Promise<void> {
    const button = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Cancel')]")
    );
    await button.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async clickBack(): Promise<void> {
    const button = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Back')]")
    );
    await button.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async isSubmitButtonEnabled(): Promise<boolean> {
    try {
      const button = await this.driver.findElement(
        By.xpath("//button[@type='submit' and contains(text(), 'Submit Feedback')]")
      );
      return await button.isEnabled();
    } catch {
      return false;
    }
  }

  async getTitleValue(): Promise<string> {
    const input = await this.driver.findElement(By.id('feedback-title'));
    return await input.getAttribute('value');
  }

  async getDescriptionValue(): Promise<string> {
    const textarea = await this.driver.findElement(By.id('feedback-description'));
    return await textarea.getAttribute('value');
  }
}

