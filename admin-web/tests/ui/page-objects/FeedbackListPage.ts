import { WebDriver, By, until } from 'selenium-webdriver';
import { getBaseUrl } from '../helpers/test-base.js';

export class FeedbackListPage {
  constructor(private driver: WebDriver) {}

  async open(): Promise<void> {
    const baseUrl = getBaseUrl();
    await this.driver.get(`${baseUrl}/feedback`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Feedback & Issues')]")),
      15000
    );
  }

  async isDisplayed(): Promise<boolean> {
    try {
      const title = await this.driver.findElement(
        By.xpath("//h1[contains(text(), 'Feedback & Issues')]")
      );
      return await title.isDisplayed();
    } catch {
      return false;
    }
  }

  async clickSubmitFeedback(): Promise<void> {
    const button = await this.driver.wait(
      until.elementLocated(By.xpath("//a[contains(text(), 'Submit Feedback')]")),
      10000
    );
    await button.click();
    // Wait for navigation
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async clickExportCSV(): Promise<void> {
    const button = await this.driver.wait(
      until.elementLocated(By.xpath("//button[contains(text(), 'Export CSV')]")),
      10000
    );
    await button.click();
  }

  async setStatusFilter(status: string): Promise<void> {
    // Map status display names to values
    const statusMap: Record<string, string> = {
      'Open': 'OPEN',
      'In Progress': 'IN_PROGRESS',
      'Resolved': 'RESOLVED',
      'Closed': 'CLOSED',
      'Rejected': 'REJECTED',
      'OPEN': 'OPEN',
      'IN_PROGRESS': 'IN_PROGRESS',
      'RESOLVED': 'RESOLVED',
      'CLOSED': 'CLOSED',
      'REJECTED': 'REJECTED',
    };
    
    const statusValue = statusMap[status] || status;
    const select = await this.driver.findElement(By.id('status-filter'));
    
    // Use JavaScript to set the value directly (more reliable than clicking)
    await this.driver.executeScript(
      `arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('change', { bubbles: true }));`,
      select,
      statusValue
    );
    
    // Wait for filter to apply
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async setPriorityFilter(priority: string): Promise<void> {
    // Map priority values to option values
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
    const select = await this.driver.findElement(By.id('priority-filter'));
    
    // Use JavaScript to set the value directly (more reliable than clicking)
    await this.driver.executeScript(
      `arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('change', { bubbles: true }));`,
      select,
      priorityValue
    );
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async setCategoryFilter(category: string): Promise<void> {
    const input = await this.driver.findElement(By.id('category-filter'));
    await input.clear();
    await input.sendKeys(category);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async setSearchFilter(searchText: string): Promise<void> {
    const input = await this.driver.findElement(By.id('search-filter'));
    await input.clear();
    await input.sendKeys(searchText);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async getFeedbackCount(): Promise<number> {
    try {
      const cards = await this.driver.findElements(
        By.css('[class*="space-y-4"] > div, [data-testid="feedback-card"]')
      );
      return cards.length;
    } catch {
      return 0;
    }
  }

  async clickFeedbackCard(index: number = 0): Promise<void> {
    const cards = await this.driver.findElements(
      By.xpath("//div[contains(@class, 'space-y-4')]//div[contains(@class, 'bg-white')]")
    );
    if (cards.length > index) {
      await cards[index].click();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async clickFirstFeedback(): Promise<void> {
    await this.clickFeedbackCard(0);
  }

  async isExportButtonVisible(): Promise<boolean> {
    try {
      const button = await this.driver.findElement(
        By.xpath("//button[contains(text(), 'Export CSV')]")
      );
      return await button.isDisplayed();
    } catch {
      return false;
    }
  }

  async waitForFeedbackList(): Promise<void> {
    // Wait for either feedback list or "no results" message
    // The list might be empty after filtering, so we wait for the container or loading/error message
    try {
      await this.driver.wait(
        until.elementLocated(
          By.xpath("//div[contains(@class, 'space-y-4')] | //div[contains(text(), 'Loading')] | //div[contains(text(), 'Error')] | //div[contains(text(), 'No feedback')]")
        ),
        10000
      );
    } catch {
      // If nothing found, that's okay - the page might have loaded with no results
      // Just wait a bit for any async operations to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

