import { WebDriver, By, until } from 'selenium-webdriver';
import { getBaseUrl } from '../helpers/test-base.js';

export class FeedbackDetailPage {
  constructor(private driver: WebDriver) {}

  async open(feedbackId: string): Promise<void> {
    const baseUrl = getBaseUrl();
    await this.driver.get(`${baseUrl}/feedback/${feedbackId}`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(@class, 'text-2xl font-bold')]")),
      15000
    );
  }

  async isDisplayed(): Promise<boolean> {
    try {
      const title = await this.driver.findElement(
        By.xpath("//h1[contains(@class, 'text-2xl font-bold')]")
      );
      return await title.isDisplayed();
    } catch {
      return false;
    }
  }

  async getTitle(): Promise<string> {
    const title = await this.driver.findElement(
      By.xpath("//h1[contains(@class, 'text-2xl font-bold')]")
    );
    return await title.getText();
  }

  async getDescription(): Promise<string> {
    const desc = await this.driver.findElement(
      By.xpath("//h3[contains(text(), 'Description')]/following-sibling::p")
    );
    return await desc.getText();
  }

  async getStatus(): Promise<string> {
    const status = await this.driver.findElement(
      By.xpath("//span[contains(@class, 'px-3 py-1 text-sm font-medium rounded')][1]")
    );
    return await status.getText();
  }

  async getPriority(): Promise<string> {
    const priority = await this.driver.findElement(
      By.xpath("//span[contains(@class, 'px-3 py-1 text-sm font-medium rounded')][2]")
    );
    return await priority.getText();
  }

  async clickBackToList(): Promise<void> {
    const button = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Back to List')]")
    );
    await button.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async setStatus(status: string): Promise<void> {
    const select = await this.driver.findElement(By.id('update-status'));
    await select.click();
    const option = await this.driver.findElement(
      By.xpath(`//select[@id='update-status']/option[text()='${status}']`)
    );
    await option.click();
  }

  async setPriority(priority: string): Promise<void> {
    const select = await this.driver.findElement(By.id('update-priority'));
    await select.click();
    const option = await this.driver.findElement(
      By.xpath(`//select[@id='update-priority']/option[text()='${priority}']`)
    );
    await option.click();
  }

  async setAssignee(userId: string): Promise<void> {
    const input = await this.driver.findElement(By.id('update-assignee'));
    await input.clear();
    await input.sendKeys(userId);
  }

  async clickUpdate(): Promise<void> {
    const button = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Update')]")
    );
    await button.click();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async clickAnalyzeSentiment(): Promise<void> {
    const button = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Analyze Sentiment')]")
    );
    await button.click();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async clickNotifyTeams(): Promise<void> {
    const button = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Notify Teams')]")
    );
    await button.click();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async isAdminControlsVisible(): Promise<boolean> {
    try {
      const updateSection = await this.driver.findElement(
        By.xpath("//h3[contains(text(), 'Update Feedback')]")
      );
      return await updateSection.isDisplayed();
    } catch {
      return false;
    }
  }

  async addMessage(content: string): Promise<void> {
    // Find the message input (textarea)
    const textarea = await this.driver.wait(
      until.elementLocated(
        By.xpath("//textarea[contains(@placeholder, 'message') or contains(@placeholder, 'comment')]")
      ),
      10000
    );
    await textarea.clear();
    await textarea.sendKeys(content);

    // Find and click send button
    const sendButton = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Send')]")
    );
    await sendButton.click();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async getMessagesCount(): Promise<number> {
    try {
      const messages = await this.driver.findElements(
        By.xpath("//div[contains(@class, 'message') or contains(@class, 'thread')]//div[contains(@class, 'p-')]")
      );
      return messages.length;
    } catch {
      return 0;
    }
  }
}

