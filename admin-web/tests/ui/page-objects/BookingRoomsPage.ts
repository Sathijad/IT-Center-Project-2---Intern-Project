import { WebDriver, By, until } from 'selenium-webdriver';
import { getBaseUrl } from '../helpers/test-base.js';

export class BookingRoomsPage {
  constructor(private driver: WebDriver) {}

  async open(): Promise<void> {
    const baseUrl = getBaseUrl();
    await this.driver.get(`${baseUrl}/admin/booking/rooms`);
    // Wait for page to load - try multiple possible headings
    try {
      await this.driver.wait(
        until.elementLocated(By.xpath("//h1[contains(text(), 'Room Management')]")),
        15000
      );
    } catch {
      // Try alternative: just "Rooms"
      try {
        await this.driver.wait(
          until.elementLocated(By.xpath("//h1[contains(text(), 'Rooms')]")),
          10000
        );
      } catch {
        // Try: wait for any h1 or the table/room list
        await this.driver.wait(
          until.elementLocated(By.css('h1, table, div[class*="grid"]')),
          15000
        );
      }
    }
  }

  async getRoomCount(): Promise<number> {
    const rooms = await this.driver.findElements(
      By.css('div[class*="border"], tr[class*="border"]')
    );
    return rooms.length;
  }

  async clickViewRoom(roomName: string): Promise<void> {
    const viewButton = await this.driver.wait(
      until.elementLocated(
        By.xpath(`//div[contains(., '${roomName}')]//button[contains(text(), 'View')]`)
      ),
      10000
    );
    await viewButton.click();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async isRoomListVisible(): Promise<boolean> {
    try {
      const roomList = await this.driver.findElement(
        By.css('div[class*="grid"], table')
      );
      return await roomList.isDisplayed();
    } catch {
      return false;
    }
  }
}

