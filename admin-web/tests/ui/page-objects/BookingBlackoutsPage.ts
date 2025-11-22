import { WebDriver, By, until } from 'selenium-webdriver';
import { getBaseUrl } from '../helpers/test-base.js';

export class BookingBlackoutsPage {
  constructor(private driver: WebDriver) {}

  async open(): Promise<void> {
    const baseUrl = getBaseUrl();
    await this.driver.get(`${baseUrl}/admin/booking/blackouts`);
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Blackout')]")),
      15000
    );
  }

  async clickCreateBlackout(): Promise<void> {
    const createButton = await this.driver.wait(
      until.elementLocated(By.xpath("//button[contains(text(), 'Create') or contains(text(), 'Add')]")),
      10000
    );
    await createButton.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async selectRoom(roomName: string): Promise<void> {
    const roomSelect = await this.driver.wait(
      until.elementLocated(By.css('select[name*="room" i]')),
      10000
    );
    await roomSelect.click();
    const option = await this.driver.wait(
      until.elementLocated(
        By.xpath(`//option[contains(text(), '${roomName}')]`)
      ),
      5000
    );
    await option.click();
  }

  async enterStartDateTime(dateTime: string): Promise<void> {
    const startInput = await this.driver.wait(
      until.elementLocated(By.css('input[type="datetime-local"][name*="start" i]')),
      10000
    );
    await startInput.clear();
    await startInput.sendKeys(dateTime);
  }

  async enterEndDateTime(dateTime: string): Promise<void> {
    const endInput = await this.driver.wait(
      until.elementLocated(By.css('input[type="datetime-local"][name*="end" i]')),
      10000
    );
    await endInput.clear();
    await endInput.sendKeys(dateTime);
  }

  async enterReason(reason: string): Promise<void> {
    try {
      const reasonInput = await this.driver.wait(
        until.elementLocated(By.css('input[name*="reason" i], textarea[name*="reason" i]')),
        5000
      );
      await reasonInput.clear();
      await reasonInput.sendKeys(reason);
    } catch {
      // Reason might be optional
      console.log('Reason input not found, skipping...');
    }
  }

  async clickSave(): Promise<void> {
    const saveButton = await this.driver.wait(
      until.elementLocated(By.xpath("//button[contains(text(), 'Save') or contains(text(), 'Create')]")),
      10000
    );
    await saveButton.click();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async getBlackoutCount(): Promise<number> {
    const blackouts = await this.driver.findElements(
      By.css('div[class*="border"], tr[class*="border"]')
    );
    return blackouts.length;
  }
}

