import { WebDriver, By, until } from 'selenium-webdriver';
import { getBaseUrl } from '../helpers/test-base.js';

export class MyBookingsPage {
  constructor(private driver: WebDriver) {}

  async open(): Promise<void> {
    const baseUrl = getBaseUrl();
    await this.driver.get(`${baseUrl}/bookings/my`);
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'My Bookings')]")),
      15000
    );
  }

  async getBookingCount(): Promise<number> {
    try {
      const bookings = await this.driver.findElements(
        By.css('div[class*="border"][class*="rounded"], div[class*="shadow"]')
      );
      return bookings.length;
    } catch {
      return 0;
    }
  }

  async cancelBooking(bookingTitle?: string): Promise<void> {
    try {
      let cancelButton;
      if (bookingTitle) {
        // Find cancel button for specific booking
        cancelButton = await this.driver.wait(
          until.elementLocated(
            By.xpath(`//div[contains(., '${bookingTitle}')]//button[contains(text(), 'Cancel')]`)
          ),
          10000
        );
      } else {
        // Find first cancel button
        cancelButton = await this.driver.wait(
          until.elementLocated(By.xpath("//button[contains(text(), 'Cancel')]")),
          10000
        );
      }
      await cancelButton.click();
      
      // Handle confirmation dialog
      await this.driver.wait(async () => {
        try {
          const alert = await this.driver.switchTo().alert();
          await alert.accept();
          return true;
        } catch {
          return false;
        }
      }, 5000);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log('Could not cancel booking:', error);
    }
  }

  async hasBookings(): Promise<boolean> {
    try {
      const emptyMessage = await this.driver.findElement(
        By.xpath("//p[contains(text(), 'don't have any bookings')]")
      );
      return !(await emptyMessage.isDisplayed());
    } catch {
      // If empty message not found, assume there are bookings
      return true;
    }
  }

  async getBookingTitles(): Promise<string[]> {
    const titles: string[] = [];
    try {
      const titleElements = await this.driver.findElements(
        By.css('h3[class*="font"], h2[class*="font"]')
      );
      for (const element of titleElements) {
        const text = await element.getText();
        if (text && text.trim()) {
          titles.push(text.trim());
        }
      }
    } catch {
      // No titles found
    }
    return titles;
  }
}

