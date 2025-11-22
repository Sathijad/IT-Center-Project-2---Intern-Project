import { WebDriver, By, until } from 'selenium-webdriver';
import { getBaseUrl } from '../helpers/test-base.js';

export class BookRoomPage {
  constructor(private driver: WebDriver) {}

  async open(): Promise<void> {
    const baseUrl = getBaseUrl();
    await this.driver.get(`${baseUrl}/bookings/new`);
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Book a Room')]")),
      15000
    );
  }

  async searchRooms(capacity?: string, location?: string): Promise<void> {
    if (capacity) {
      // Find capacity input by label text "Minimum Capacity" or by input type number
      try {
        // Try to find by label text first
        const capacityLabel = await this.driver.wait(
          until.elementLocated(By.xpath("//label[contains(text(), 'Minimum Capacity')]")),
          5000
        );
        const capacityInput = await capacityLabel.findElement(By.xpath("./following-sibling::input | ./../input"));
        await capacityInput.clear();
        await capacityInput.sendKeys(capacity);
      } catch {
        // Fallback: find by input type number in the search section
        try {
          const capacityInput = await this.driver.wait(
            until.elementLocated(By.xpath("//h2[contains(text(), 'Search Rooms')]/following::input[@type='number'][1]")),
            5000
          );
          await capacityInput.clear();
          await capacityInput.sendKeys(capacity);
        } catch {
          // Last resort: find any number input
          const capacityInput = await this.driver.wait(
            until.elementLocated(By.css('input[type="number"]')),
            5000
          );
          await capacityInput.clear();
          await capacityInput.sendKeys(capacity);
        }
      }
    }

    if (location) {
      // Find location input by label text "Location" or placeholder
      try {
        const locationLabel = await this.driver.wait(
          until.elementLocated(By.xpath("//label[contains(text(), 'Location')]")),
          5000
        );
        const locationInput = await locationLabel.findElement(By.xpath("./following-sibling::input | ./../input"));
        await locationInput.clear();
        await locationInput.sendKeys(location);
      } catch {
        // Fallback: find by placeholder
        try {
          const locationInput = await this.driver.wait(
            until.elementLocated(By.css('input[placeholder*="Building" i], input[placeholder*="Floor" i]')),
            5000
          );
          await locationInput.clear();
          await locationInput.sendKeys(location);
        } catch {
          // Last resort: find text input after capacity
          const locationInput = await this.driver.wait(
            until.elementLocated(By.xpath("//input[@type='number']/following::input[@type='text'][1]")),
            5000
          );
          await locationInput.clear();
          await locationInput.sendKeys(location);
        }
      }
    }

    // Wait for search results to load
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async selectRoom(roomName: string): Promise<void> {
    const roomCard = await this.driver.wait(
      until.elementLocated(
        By.xpath(`//div[contains(@class, 'border')]//h3[contains(text(), '${roomName}')]`)
      ),
      10000
    );
    await roomCard.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async enterStartDateTime(dateTime: string): Promise<void> {
    const startInput = await this.driver.wait(
      until.elementLocated(By.css('input[type="datetime-local"][name*="start" i], input[name="start_ts"]')),
      10000
    );
    await startInput.clear();
    await startInput.sendKeys(dateTime);
  }

  async enterEndDateTime(dateTime: string): Promise<void> {
    const endInput = await this.driver.wait(
      until.elementLocated(By.css('input[type="datetime-local"][name*="end" i], input[name="end_ts"]')),
      10000
    );
    await endInput.clear();
    await endInput.sendKeys(dateTime);
  }

  async enterTitle(title: string): Promise<void> {
    try {
      const titleInput = await this.driver.wait(
        until.elementLocated(By.css('input[name*="title" i], input[placeholder*="title" i]')),
        5000
      );
      await titleInput.clear();
      await titleInput.sendKeys(title);
    } catch {
      // Title might be optional
      console.log('Title input not found, skipping...');
    }
  }

  async enterAttendees(attendees: string): Promise<void> {
    try {
      const attendeesInput = await this.driver.wait(
        until.elementLocated(By.css('input[name*="attendees" i], textarea[name*="attendees" i]')),
        5000
      );
      await attendeesInput.clear();
      await attendeesInput.sendKeys(attendees);
    } catch {
      // Attendees might be optional
      console.log('Attendees input not found, skipping...');
    }
  }

  async clickBookRoom(): Promise<void> {
    const bookButton = await this.driver.wait(
      until.elementLocated(By.xpath("//button[contains(text(), 'Book Room')]")),
      10000
    );
    await bookButton.click();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async isAvailabilityVisible(): Promise<boolean> {
    try {
      const availability = await this.driver.findElement(
        By.xpath("//div[contains(text(), 'Available') or contains(text(), 'Unavailable')]")
      );
      return await availability.isDisplayed();
    } catch {
      return false;
    }
  }

  async getRoomCount(): Promise<number> {
    const rooms = await this.driver.findElements(
      By.css('div[class*="border"][class*="rounded"]')
    );
    return rooms.length;
  }
}

