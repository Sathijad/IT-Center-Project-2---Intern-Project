import { WebDriver, By, until } from 'selenium-webdriver';
import { getBaseUrl } from '../helpers/test-base.js';

export class KpiReportsPage {
  constructor(private driver: WebDriver) {}

  async open(): Promise<void> {
    const baseUrl = getBaseUrl();
    await this.driver.get(`${baseUrl}/performance/reports`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'KPI Reports')]")),
      15000
    );
  }

  async isDisplayed(): Promise<boolean> {
    try {
      const title = await this.driver.findElement(
        By.xpath("//h1[contains(text(), 'KPI Reports')]")
      );
      return await title.isDisplayed();
    } catch {
      return false;
    }
  }

  async setUserIdFilter(userId: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'User ID')]/following-sibling::input")
    );
    await input.clear();
    if (userId) {
      await input.sendKeys(userId);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async setTeamIdFilter(teamId: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Team ID')]/following-sibling::input")
    );
    await input.clear();
    if (teamId) {
      await input.sendKeys(teamId);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async setKpiCodeFilter(kpiCode: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'KPI Code')]/following-sibling::input")
    );
    await input.clear();
    if (kpiCode) {
      await input.sendKeys(kpiCode);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async setTimeRange(range: string): Promise<void> {
    const select = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Time Range')]/following-sibling::select")
    );
    await this.driver.executeScript(
      `arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('change', { bubbles: true }));`,
      select,
      range
    );
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async clickClearFilters(): Promise<void> {
    const button = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Clear Filters')]")
    );
    await button.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async clickSnapshotView(): Promise<void> {
    const button = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Snapshot')]")
    );
    await button.click();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async clickTimeSeriesView(): Promise<void> {
    const button = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Time Series')]")
    );
    await button.click();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async getKpiCount(): Promise<number> {
    try {
      const rows = await this.driver.findElements(
        By.xpath("//table//tbody//tr")
      );
      return rows.length;
    } catch {
      return 0;
    }
  }

  async isSnapshotViewActive(): Promise<boolean> {
    try {
      const button = await this.driver.findElement(
        By.xpath("//button[contains(text(), 'Snapshot')]")
      );
      const classes = await button.getAttribute('class');
      return classes.includes('bg-blue-600');
    } catch {
      return false;
    }
  }

  async isTimeSeriesViewActive(): Promise<boolean> {
    try {
      const button = await this.driver.findElement(
        By.xpath("//button[contains(text(), 'Time Series')]")
      );
      const classes = await button.getAttribute('class');
      return classes.includes('bg-blue-600');
    } catch {
      return false;
    }
  }
}

