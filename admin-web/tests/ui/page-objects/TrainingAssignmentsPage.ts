import { WebDriver, By, until } from 'selenium-webdriver';
import { getBaseUrl } from '../helpers/test-base.js';

export class TrainingAssignmentsPage {
  constructor(private driver: WebDriver) {}

  async open(): Promise<void> {
    const baseUrl = getBaseUrl();
    await this.driver.get(`${baseUrl}/training/assignments`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Training Assignments')]")),
      15000
    );
  }

  async isDisplayed(): Promise<boolean> {
    try {
      const title = await this.driver.findElement(
        By.xpath("//h1[contains(text(), 'Training Assignments')]")
      );
      return await title.isDisplayed();
    } catch {
      return false;
    }
  }

  async clickAssignTraining(): Promise<void> {
    const button = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Assign Training')]")
    );
    await button.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async clickSendNotifications(): Promise<void> {
    const button = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Send Notifications')]")
    );
    await button.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async isAssignModalVisible(): Promise<boolean> {
    try {
      const modal = await this.driver.findElement(
        By.xpath("//h2[contains(text(), 'Assign Training')]")
      );
      return await modal.isDisplayed();
    } catch {
      return false;
    }
  }

  async isNotifyModalVisible(): Promise<boolean> {
    try {
      const modal = await this.driver.findElement(
        By.xpath("//h2[contains(text(), 'Send Notifications')]")
      );
      return await modal.isDisplayed();
    } catch {
      return false;
    }
  }

  async selectCourse(courseTitle: string): Promise<void> {
    const select = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Course')]/following-sibling::select")
    );
    await this.driver.executeScript(
      `const select = arguments[0]; const option = Array.from(select.options).find(opt => opt.text.includes(arguments[1])); if (option) { select.value = option.value; select.dispatchEvent(new Event('change', { bubbles: true })); }`,
      select,
      courseTitle
    );
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async setAssigneeType(type: string): Promise<void> {
    const select = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Assignee Type')]/following-sibling::select")
    );
    await this.driver.executeScript(
      `arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('change', { bubbles: true }));`,
      select,
      type
    );
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async setUserId(userId: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'User ID')]/following-sibling::input[@type='number']")
    );
    await input.clear();
    await input.sendKeys(userId);
  }

  async setCohortId(cohortId: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Cohort ID')]/following-sibling::input")
    );
    await input.clear();
    await input.sendKeys(cohortId);
  }

  async setDueDate(dateTime: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Due Date')]/following-sibling::input[@type='datetime-local']")
    );
    await input.clear();
    if (dateTime) {
      await input.sendKeys(dateTime);
    }
  }

  async clickAssign(): Promise<void> {
    // Find button inside the Assign Training modal
    const button = await this.driver.findElement(
      By.xpath("//h2[contains(text(), 'Assign Training')]/ancestor::div[contains(@class, 'bg-white')]//button[contains(text(), 'Assign') and not(contains(text(), 'Training'))]")
    );
    
    // Verify button is visible and enabled
    await this.driver.wait(async () => {
      try {
        const isDisplayed = await button.isDisplayed();
        const isEnabled = await button.isEnabled();
        return isDisplayed && isEnabled;
      } catch {
        return false;
      }
    }, 5000);
    
    // Use JavaScript click for reliability
    await this.driver.executeScript('arguments[0].click();', button);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async clickCancel(): Promise<void> {
    // Find cancel button in the currently visible modal (Assign or Notify)
    let button;
    try {
      button = await this.driver.findElement(
        By.xpath("//h2[contains(text(), 'Assign Training')]/ancestor::div[contains(@class, 'bg-white')]//button[contains(text(), 'Cancel')]")
      );
    } catch {
      try {
        button = await this.driver.findElement(
          By.xpath("//h2[contains(text(), 'Send Notifications')]/ancestor::div[contains(@class, 'bg-white')]//button[contains(text(), 'Cancel')]")
        );
      } catch {
        // Fallback
        button = await this.driver.findElement(
          By.xpath("//button[contains(text(), 'Cancel')]")
        );
      }
    }
    // Use JavaScript click for reliability
    await this.driver.executeScript('arguments[0].click();', button);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Notification modal methods
  async setNotifyUserId(userId: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//h2[contains(text(), 'Send Notifications')]/ancestor::div//label[contains(text(), 'User ID')]/following-sibling::input")
    );
    await input.clear();
    if (userId) {
      await input.sendKeys(userId);
    }
  }

  async setNotifyTeamId(teamId: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//h2[contains(text(), 'Send Notifications')]/ancestor::div//label[contains(text(), 'Team ID')]/following-sibling::input")
    );
    await input.clear();
    if (teamId) {
      await input.sendKeys(teamId);
    }
  }

  async setOverdueOnly(checked: boolean): Promise<void> {
    // The checkbox is a direct child of the label, and the text is in a span
    // Structure: <label><input type="checkbox" /><span>Overdue assignments only</span></label>
    const checkbox = await this.driver.findElement(
      By.xpath("//label[contains(., 'Overdue assignments only')]/input[@type='checkbox']")
    );
    const isChecked = await checkbox.isSelected();
    if (isChecked !== checked) {
      // Use JavaScript click for reliability
      await this.driver.executeScript('arguments[0].click();', checkbox);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  async setIncompleteOnly(checked: boolean): Promise<void> {
    // The checkbox is a direct child of the label
    const checkbox = await this.driver.findElement(
      By.xpath("//label[contains(., 'Incomplete assignments only')]/input[@type='checkbox']")
    );
    const isChecked = await checkbox.isSelected();
    if (isChecked !== checked) {
      // Use JavaScript click for reliability
      await this.driver.executeScript('arguments[0].click();', checkbox);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  async clickSendNotificationsButton(): Promise<void> {
    // Find button inside the Send Notifications modal (the one that's not the header button)
    const button = await this.driver.findElement(
      By.xpath("//h2[contains(text(), 'Send Notifications')]/ancestor::div[contains(@class, 'bg-white')]//button[contains(text(), 'Send Notifications') and contains(@class, 'bg-green-700')]")
    );
    
    // Verify button is visible and enabled
    await this.driver.wait(async () => {
      try {
        const isDisplayed = await button.isDisplayed();
        const isEnabled = await button.isEnabled();
        return isDisplayed && isEnabled;
      } catch {
        return false;
      }
    }, 5000);
    
    // Use JavaScript click for reliability
    await this.driver.executeScript('arguments[0].click();', button);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

