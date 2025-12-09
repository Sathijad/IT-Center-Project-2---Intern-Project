import { WebDriver, By, until } from 'selenium-webdriver';
import { getBaseUrl } from '../helpers/test-base.js';

export class KpiActualsPage {
  constructor(private driver: WebDriver) {}

  async open(): Promise<void> {
    const baseUrl = getBaseUrl();
    await this.driver.get(`${baseUrl}/performance/actuals`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'KPI Actuals')]")),
      15000
    );
  }

  async isDisplayed(): Promise<boolean> {
    try {
      const title = await this.driver.findElement(
        By.xpath("//h1[contains(text(), 'KPI Actuals')]")
      );
      return await title.isDisplayed();
    } catch {
      return false;
    }
  }

  async clickRecordActualValue(): Promise<void> {
    const button = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Record Actual Value')]")
    );
    await button.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async isCreateModalVisible(): Promise<boolean> {
    try {
      const modal = await this.driver.findElement(
        By.xpath("//h2[contains(text(), 'Record KPI Actual Value')]")
      );
      return await modal.isDisplayed();
    } catch {
      return false;
    }
  }

  async selectKpi(kpiName: string): Promise<void> {
    const select = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'KPI')]/following-sibling::select")
    );
    await this.driver.executeScript(
      `const select = arguments[0]; const option = Array.from(select.options).find(opt => opt.text.includes(arguments[1])); if (option) { select.value = option.value; select.dispatchEvent(new Event('change', { bubbles: true })); }`,
      select,
      kpiName
    );
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async setMeasuredValue(value: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Measured Value')]/following-sibling::div//input[@type='number']")
    );
    await input.clear();
    await input.sendKeys(value);
  }

  async setMeasuredAt(dateTime: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Measurement Date')]/following-sibling::input[@type='datetime-local']")
    );
    await input.clear();
    await input.sendKeys(dateTime);
  }

  async setUserId(userId: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'User ID')]/following-sibling::input[@type='number']")
    );
    await input.clear();
    if (userId) {
      await input.sendKeys(userId);
    }
  }

  async setTeamId(teamId: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Team ID')]/following-sibling::input[@type='number']")
    );
    await input.clear();
    if (teamId) {
      await input.sendKeys(teamId);
    }
  }

  async setPeriodStart(date: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Period Start')]/following-sibling::input[@type='date']")
    );
    await input.clear();
    if (date) {
      await input.sendKeys(date);
    }
  }

  async setPeriodEnd(date: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Period End')]/following-sibling::input[@type='date']")
    );
    await input.clear();
    if (date) {
      await input.sendKeys(date);
    }
  }

  async clickRecordValue(): Promise<void> {
    // Find button inside the Record KPI Actual Value modal
    const button = await this.driver.findElement(
      By.xpath("//h2[contains(text(), 'Record KPI Actual Value')]/ancestor::div[contains(@class, 'bg-white')]//button[contains(text(), 'Record Value')]")
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
    // Find cancel button in the Record Actual Value modal
    const button = await this.driver.findElement(
      By.xpath("//h2[contains(text(), 'Record KPI Actual Value')]/ancestor::div[contains(@class, 'bg-white')]//button[contains(text(), 'Cancel')]")
    );
    // Use JavaScript click for reliability
    await this.driver.executeScript('arguments[0].click();', button);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

