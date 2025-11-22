import { WebDriver, By, until } from 'selenium-webdriver';
import { getBaseUrl } from '../helpers/test-base.js';

export class AdminBookingsPage {
  constructor(private driver: WebDriver) {}

  async open(): Promise<void> {
    const baseUrl = getBaseUrl();
    await this.driver.get(`${baseUrl}/admin/booking/bookings`);
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'All Bookings') or contains(text(), 'Bookings')]")),
      15000
    );
  }

  async filterByRoom(roomName: string): Promise<void> {
    try {
      // Find room select by label "Room"
      const roomLabel = await this.driver.wait(
        until.elementLocated(By.xpath("//label[contains(text(), 'Room')]")),
        10000
      );
      const roomSelect = await roomLabel.findElement(By.xpath("./following-sibling::select | ./../select"));
      await roomSelect.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const option = await this.driver.wait(
        until.elementLocated(
          By.xpath(`//option[contains(text(), '${roomName}')]`)
        ),
        5000
      );
      await option.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch {
      // Fallback: try to find any select after "Room" label
      const roomSelect = await this.driver.wait(
        until.elementLocated(By.xpath("//label[contains(text(), 'Room')]/following::select[1]")),
        10000
      );
      await roomSelect.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      const option = await this.driver.wait(
        until.elementLocated(
          By.xpath(`//option[contains(text(), '${roomName}')]`)
        ),
        5000
      );
      await option.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  async filterByStatus(status: string): Promise<void> {
    try {
      // Find status select by label "Status"
      const statusLabel = await this.driver.wait(
        until.elementLocated(By.xpath("//label[contains(text(), 'Status')]")),
        10000
      );
      const statusSelect = await statusLabel.findElement(By.xpath("./following-sibling::select | ./../select"));
      await statusSelect.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Find and click the option - try both exact match and contains
      try {
        const option = await this.driver.wait(
          until.elementLocated(
            By.xpath(`//select[.//option[contains(text(), '${status}')]]//option[contains(text(), '${status}')]`)
          ),
          5000
        );
        await option.click();
      } catch {
        // Try finding option by value
        const option = await this.driver.wait(
          until.elementLocated(
            By.xpath(`//option[@value='${status}']`)
          ),
          5000
        );
        await option.click();
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch {
      // Fallback: try to find any select after "Status" label
      const statusSelect = await this.driver.wait(
        until.elementLocated(By.xpath("//label[contains(text(), 'Status')]/following::select[1]")),
        10000
      );
      await statusSelect.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      const option = await this.driver.wait(
        until.elementLocated(By.xpath(`//option[@value='${status}']`)),
        5000
      );
      await option.click();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  async filterByDateRange(startDate: string, endDate: string): Promise<void> {
    const startInput = await this.driver.wait(
      until.elementLocated(By.css('input[type="date"][name*="start" i]')),
      10000
    );
    await startInput.clear();
    await startInput.sendKeys(startDate);

    const endInput = await this.driver.wait(
      until.elementLocated(By.css('input[type="date"][name*="end" i]')),
      10000
    );
    await endInput.clear();
    await endInput.sendKeys(endDate);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async getBookingCount(): Promise<number> {
    const bookings = await this.driver.findElements(
      By.css('tbody tr, div[class*="border"][class*="rounded"]')
    );
    return bookings.length;
  }

  async isFiltersVisible(): Promise<boolean> {
    try {
      const filters = await this.driver.findElement(
        By.xpath("//h2[contains(text(), 'Filter')]")
      );
      return await filters.isDisplayed();
    } catch {
      return false;
    }
  }
}

