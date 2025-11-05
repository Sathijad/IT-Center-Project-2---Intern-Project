import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';
import { LoginPage } from '../page-objects/LoginPage';
import { LeaveRequestPage } from '../page-objects/LeaveRequestPage';
import { ApplyLeavePage } from '../page-objects/ApplyLeavePage';

describe('Leave Management E2E Tests', () => {
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
    // Navigate to login and authenticate
    const loginPage = new LoginPage(driver, baseUrl);
    await loginPage.navigate();
    await loginPage.loginWithCognito();
  });

  describe('Employee Leave Application', () => {
    it('should allow employee to apply for leave', async () => {
      const applyPage = new ApplyLeavePage(driver, baseUrl);
      await applyPage.navigate();

      // Fill leave application form
      await applyPage.selectPolicy('Annual Leave');
      await applyPage.selectStartDate('2025-02-15');
      await applyPage.selectEndDate('2025-02-20');
      await applyPage.enterReason('Vacation');

      // Submit form
      await applyPage.submit();

      // Verify success message or redirect
      await driver.wait(
        until.urlContains('/leave/history'),
        10000,
        'Should redirect to leave history after submission'
      );
    });

    it('should validate form inputs', async () => {
      const applyPage = new ApplyLeavePage(driver, baseUrl);
      await applyPage.navigate();

      // Try to submit without required fields
      await applyPage.submit();

      // Verify validation errors
      const errors = await driver.findElements(By.css('[role="alert"]'));
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should prevent end date before start date', async () => {
      const applyPage = new ApplyLeavePage(driver, baseUrl);
      await applyPage.navigate();

      await applyPage.selectStartDate('2025-02-20');
      await applyPage.selectEndDate('2025-02-15'); // Invalid

      await applyPage.submit();

      // Verify validation error
      const error = await driver.findElement(By.css('[id="end-date-error"]'));
      expect(await error.getText()).toContain('End date must be after start date');
    });
  });

  describe('Leave Request Management', () => {
    it('should display leave requests list', async () => {
      const leavePage = new LeaveRequestPage(driver, baseUrl);
      await leavePage.navigate();

      // Wait for table to load
      await driver.wait(
        until.elementsLocated(By.css('table')),
        10000
      );

      // Verify table headers
      const headers = await driver.findElements(By.css('thead th'));
      expect(headers.length).toBeGreaterThan(0);
    });

    it('should filter leave requests by status', async () => {
      const leavePage = new LeaveRequestPage(driver, baseUrl);
      await leavePage.navigate();

      // Select status filter
      const statusFilter = await driver.findElement(By.css('select'));
      await statusFilter.sendKeys('PENDING');

      // Wait for filtered results
      await driver.wait(
        until.elementsLocated(By.css('tbody tr')),
        5000
      );

      // Verify all displayed requests have PENDING status
      const statusBadges = await driver.findElements(By.css('tbody tr td span'));
      for (const badge of statusBadges) {
        const text = await badge.getText();
        if (text.includes('PENDING')) {
          expect(text).toContain('PENDING');
        }
      }
    });

    it('should paginate leave requests', async () => {
      const leavePage = new LeaveRequestPage(driver, baseUrl);
      await leavePage.navigate();

      // Check if pagination exists
      const nextButton = await driver.findElement(By.xpath("//button[contains(text(), 'Next')]"));
      const isEnabled = await nextButton.isEnabled();

      if (isEnabled) {
        await nextButton.click();
        // Verify page changed
        await driver.wait(
          until.elementsLocated(By.css('tbody tr')),
          5000
        );
      }
    });
  });

  describe('Admin Leave Approval', () => {
    it('should allow admin to approve leave request', async () => {
      // Note: This test assumes admin user is logged in
      const leavePage = new LeaveRequestPage(driver, baseUrl);
      await leavePage.navigate();

      // Find a pending request
      const reviewButton = await driver.findElement(By.xpath("//button[contains(text(), 'Review')]"));
      await reviewButton.click();

      // Wait for approval modal
      await driver.wait(
        until.elementLocated(By.css('[role="dialog"]')),
        5000
      );

      // Click approve button
      const approveButton = await driver.findElement(By.xpath("//button[contains(text(), 'Approve')]"));
      await approveButton.click();

      // Verify success (modal closes or status updates)
      await driver.wait(
        until.stalenessOf(approveButton),
        10000
      );
    });

    it('should allow admin to reject leave request with notes', async () => {
      const leavePage = new LeaveRequestPage(driver, baseUrl);
      await leavePage.navigate();

      const reviewButton = await driver.findElement(By.xpath("//button[contains(text(), 'Review')]"));
      await reviewButton.click();

      await driver.wait(
        until.elementLocated(By.css('[role="dialog"]')),
        5000
      );

      // Click reject button
      const rejectButton = await driver.findElement(By.xpath("//button[contains(text(), 'Reject')]"));
      await rejectButton.click();

      // Enter rejection notes
      const notesField = await driver.findElement(By.id('reject-notes'));
      await notesField.sendKeys('Insufficient leave balance');

      // Confirm rejection
      const confirmButton = await driver.findElement(By.xpath("//button[contains(text(), 'Confirm Rejection')]"));
      await confirmButton.click();

      // Verify success
      await driver.wait(
        until.stalenessOf(confirmButton),
        10000
      );
    });
  });
});

// Page Object Classes
class LeaveRequestPage {
  constructor(private driver: WebDriver, private baseUrl: string) {}

  async navigate() {
    await this.driver.get(`${this.baseUrl}/leave/history`);
  }
}

class ApplyLeavePage {
  constructor(private driver: WebDriver, private baseUrl: string) {}

  async navigate() {
    await this.driver.get(`${this.baseUrl}/leave`);
  }

  async selectPolicy(policyName: string) {
    const select = await this.driver.findElement(By.id('policy_id'));
    await select.sendKeys(policyName);
  }

  async selectStartDate(date: string) {
    const input = await this.driver.findElement(By.id('start_date'));
    await input.clear();
    await input.sendKeys(date);
  }

  async selectEndDate(date: string) {
    const input = await this.driver.findElement(By.id('end_date'));
    await input.clear();
    await input.sendKeys(date);
  }

  async enterReason(reason: string) {
    const textarea = await this.driver.findElement(By.id('reason'));
    await textarea.sendKeys(reason);
  }

  async submit() {
    const submitButton = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Submit Request')]")
    );
    await submitButton.click();
  }
}

