import { WebDriver, By, until } from 'selenium-webdriver';
import { getBaseUrl } from '../helpers/test-base.js';
import * as path from 'path';

export class KpiImportPage {
  constructor(private driver: WebDriver) {}

  async open(): Promise<void> {
    const baseUrl = getBaseUrl();
    await this.driver.get(`${baseUrl}/performance/import`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'KPI Actuals Import')]")),
      15000
    );
  }

  async isDisplayed(): Promise<boolean> {
    try {
      const title = await this.driver.findElement(
        By.xpath("//h1[contains(text(), 'KPI Actuals Import')]")
      );
      return await title.isDisplayed();
    } catch {
      return false;
    }
  }

  async uploadCsvFile(filePath: string): Promise<void> {
    const fileInput = await this.driver.findElement(By.id('file-input'));
    const absolutePath = path.resolve(filePath);
    await fileInput.sendKeys(absolutePath);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async clickUploadAndImport(): Promise<void> {
    const button = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Upload & Import')]")
    );
    await button.click();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async isFileSelected(): Promise<boolean> {
    try {
      const fileInfo = await this.driver.findElement(
        By.xpath("//p[contains(text(), 'Selected:')]")
      );
      return await fileInfo.isDisplayed();
    } catch {
      return false;
    }
  }

  async getJobStatus(): Promise<string | null> {
    try {
      const statusElement = await this.driver.findElement(
        By.xpath("//span[contains(@class, 'px-3 py-1 rounded-full')]")
      );
      return await statusElement.getText();
    } catch {
      return null;
    }
  }

  async getProcessedCount(): Promise<number> {
    try {
      const element = await this.driver.findElement(
        By.xpath("//p[contains(text(), 'Processed')]/following-sibling::p")
      );
      const text = await element.getText();
      return parseInt(text, 10) || 0;
    } catch {
      return 0;
    }
  }

  async getFailedCount(): Promise<number> {
    try {
      const element = await this.driver.findElement(
        By.xpath("//p[contains(text(), 'Failed')]/following-sibling::p")
      );
      const text = await element.getText();
      return parseInt(text, 10) || 0;
    } catch {
      return 0;
    }
  }

  async clickRefreshStatus(): Promise<void> {
    try {
      const button = await this.driver.findElement(
        By.xpath("//button[contains(text(), 'Refresh Status')]")
      );
      await button.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch {
      // Button might not be visible if job is completed
    }
  }

  async waitForJobCompletion(timeout: number = 60000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const status = await this.getJobStatus();
      if (status === 'COMPLETED' || status === 'FAILED') {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.clickRefreshStatus();
    }
    throw new Error('Job did not complete within timeout');
  }
}

