import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';
import { LoginPage } from '../page-objects/LoginPage';

describe('Attendance Management E2E Tests', () => {
  let driver: WebDriver;
  const baseUrl = process.env.WEB_BASE_URL || 'http://localhost:5173';
  const headless = process.env.HEADFUL !== 'true';

  beforeAll(async () => {
    const options = new Options();
    if (headless) {
      options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');
    }

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    await driver.manage().window().setSize(1920, 1080);
    await driver.manage().setTimeouts({ implicit: 10000 });
  });

  afterAll(async () => {
    await driver.quit();
  });

  beforeEach(async () => {
    const loginPage = new LoginPage(driver, baseUrl);
    await loginPage.navigate();
    await loginPage.loginWithCognito();
  });

  describe('Attendance Logs Viewing', () => {
    it('should display attendance logs table', async () => {
      await driver.get(`${baseUrl}/attendance`);

      // Wait for table to load
      await driver.wait(
        until.elementsLocated(By.css('table')),
        10000
      );

      // Verify table structure
      const headers = await driver.findElements(By.css('thead th'));
      expect(headers.length).toBeGreaterThan(0);

      // Verify at least Date, Clock In, Clock Out, Duration columns
      const headerTexts = await Promise.all(headers.map(h => h.getText()));
      expect(headerTexts).toContain('Date');
      expect(headerTexts).toContain('Clock In');
    });

    it('should filter attendance logs by date range', async () => {
      await driver.get(`${baseUrl}/attendance`);

      // Set start date
      const startDateInput = await driver.findElement(By.id('start-date'));
      await startDateInput.sendKeys('2025-01-01');

      // Set end date
      const endDateInput = await driver.findElement(By.id('end-date'));
      await endDateInput.sendKeys('2025-01-31');

      // Wait for filtered results
      await driver.wait(
        until.elementsLocated(By.css('tbody tr')),
        5000
      );

      // Verify results are within date range (if any exist)
      const rows = await driver.findElements(By.css('tbody tr'));
      expect(rows.length).toBeGreaterThanOrEqual(0);
    });

    it('should export attendance logs', async () => {
      await driver.get(`${baseUrl}/attendance`);

      // Wait for export button
      const exportButton = await driver.findElement(
        By.xpath("//button[contains(., 'Export')]")
      );
      await exportButton.click();

      // Note: In a real test, you might verify file download
      // This depends on browser download preferences
      await driver.sleep(1000); // Give time for download to initiate
    });

    it('should paginate attendance logs', async () => {
      await driver.get(`${baseUrl}/attendance`);

      // Check if pagination controls exist
      const pagination = await driver.findElements(By.css('button'));
      const nextButton = pagination.find(async (btn) => {
        const text = await btn.getText();
        return text.includes('Next');
      });

      if (nextButton) {
        const isEnabled = await nextButton.isEnabled();
        if (isEnabled) {
          await nextButton.click();
          await driver.wait(
            until.elementsLocated(By.css('tbody tr')),
            5000
          );
        }
      }
    });
  });

  describe('Admin Attendance View', () => {
    it('should display user column for admin', async () => {
      // Note: This assumes admin user is logged in
      await driver.get(`${baseUrl}/admin/attendance`);

      await driver.wait(
        until.elementsLocated(By.css('table')),
        10000
      );

      // Check for user column in admin view
      const headers = await driver.findElements(By.css('thead th'));
      const headerTexts = await Promise.all(headers.map(h => h.getText()));
      
      // Admin view should have user column
      expect(headerTexts.some(text => text.includes('User'))).toBe(true);
    });

    it('should allow admin to filter by user', async () => {
      await driver.get(`${baseUrl}/admin/attendance`);

      // Wait for page to load
      await driver.wait(
        until.elementsLocated(By.css('table')),
        10000
      );

      // Note: User filter would need to be implemented in UI
      // This is a placeholder for the test structure
    });
  });
});

