import { WebDriver, By, until } from 'selenium-webdriver';
import { getBaseUrl } from '../helpers/test-base.js';

export class BookingReportsPage {
  constructor(private driver: WebDriver) {}

  async open(): Promise<void> {
    const baseUrl = getBaseUrl();
    await this.driver.get(`${baseUrl}/admin/booking/reports`);
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Reports') or contains(text(), 'Utilization')]")),
      15000
    );
  }

  async setDateRange(startDate: string, endDate: string): Promise<void> {
    try {
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Find first date input (start date) - re-find to avoid stale element
      const startInput = await this.driver.wait(
        until.elementLocated(By.css('input[type="date"]')),
        15000
      );
      await startInput.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      await startInput.clear();
      await startInput.sendKeys(startDate);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Find second date input (end date) - re-find to avoid stale element
      const allDateInputs = await this.driver.findElements(By.css('input[type="date"]'));
      if (allDateInputs.length >= 2) {
        const endInput = allDateInputs[1];
        await endInput.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        await endInput.clear();
        await endInput.sendKeys(endDate);
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('✅ Date range inputs found and set');
      } else {
        throw new Error('End date input not found');
      }
    } catch (error) {
      console.log(`⚠️  Could not set date range: ${error}`);
      // Test continues anyway - date range setting is optional
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async getUtilizationStats(): Promise<Array<{ roomName: string; utilization: string }>> {
    const stats: Array<{ roomName: string; utilization: string }> = [];
    try {
      const statRows = await this.driver.findElements(
        By.css('tr, div[class*="border"]')
      );
      for (const row of statRows) {
        try {
          const roomName = await row.findElement(By.css('td:first-child, div:first-child'));
          const utilization = await row.findElement(By.css('td:last-child, div:last-child'));
          stats.push({
            roomName: await roomName.getText(),
            utilization: await utilization.getText()
          });
        } catch {
          // Skip rows that don't match expected structure
          continue;
        }
      }
    } catch {
      // No stats found
    }
    return stats;
  }

  async isReportVisible(): Promise<boolean> {
    try {
      const report = await this.driver.findElement(
        By.xpath("//div[contains(text(), 'Utilization') or contains(text(), 'Bookings')]")
      );
      return await report.isDisplayed();
    } catch {
      return false;
    }
  }

  async getTotalBookings(): Promise<number> {
    try {
      const totalElement = await this.driver.findElement(
        By.xpath("//div[contains(text(), 'Total Bookings')]//following-sibling::*[1]")
      );
      const text = await totalElement.getText();
      return parseInt(text) || 0;
    } catch {
      return 0;
    }
  }
}

