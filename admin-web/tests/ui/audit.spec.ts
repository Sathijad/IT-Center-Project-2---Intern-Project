import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { WebDriver, By, until } from 'selenium-webdriver';
import { createDriver, seedAuthToken, getBaseUrl, waitForElementVisible } from './helpers/test-base.js';
import { AuditPage } from './page-objects/AuditPage.js';

describe('Audit Log', function() {
  this.timeout(120000); // 2 minutes timeout for entire suite
  
  let driver: WebDriver;
  let auditPage: AuditPage;
  const baseUrl = getBaseUrl();

  before(async () => {
    driver = await createDriver();
    auditPage = new AuditPage(driver);
    
    // Seed auth token BEFORE app loads (critical for AuthContext)
    await seedAuthToken(driver, 'e2e-token');
    
    // Small delay to ensure token is set
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  after(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  it('should show audit log with role events', async () => {
    await driver.get(`${baseUrl}/audit`);
    
    // Wait for page header - strong explicit wait
    try {
      await waitForElementVisible(
        driver,
        By.xpath("//h1[contains(text(), 'Audit Log')]"),
        30000
      );
    } catch (error) {
      // Check if redirected to login (auth not satisfied)
      const currentUrl = await driver.getCurrentUrl();
      if (currentUrl.includes('/login')) {
        throw new Error('Audit title not visible — redirected to login (auth not satisfied). Make sure json-server is running on port 5050 and VITE_API_BASE_URL=http://localhost:5050');
      }
      throw error;
    }
    
    // Wait for loading spinner to disappear
    await driver.wait(async () => {
      const spinners = await driver.findElements(By.css('.animate-spin'));
      return spinners.length === 0;
    }, 25000);
    
    // Check if we got "No audit log entries found" message - this would indicate a data format issue
    const emptyStateElements = await driver.findElements(By.xpath("//*[contains(text(), 'No audit log entries found')]"));
    if (emptyStateElements.length > 0) {
      const emptyState = emptyStateElements[0];
      if (await emptyState.isDisplayed()) {
        // Debug: log the page source to see what's happening
        const pageSource = await driver.getPageSource();
        console.error('Page shows "No audit log entries found". Page snippet:', pageSource.substring(0, 2000));
        throw new Error('API returned data but component shows "No audit log entries found" - check response format');
      }
    }
    
    // Wait for the table to appear
    await driver.wait(
      until.elementLocated(By.css('table')),
      20000
    );
    
    // Wait a bit more for React Query to finish rendering
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Assert table headers exist (Timestamp, User, Event, IP Address)
    await waitForElementVisible(driver, By.xpath("//th[contains(.,'Timestamp')]"), 10000);
    await waitForElementVisible(driver, By.xpath("//th[contains(.,'User')]"), 10000);
    await waitForElementVisible(driver, By.xpath("//th[contains(.,'Event')]"), 10000);
    await waitForElementVisible(driver, By.xpath("//th[contains(.,'IP')]"), 10000);
    
    console.log('✓ Audit log page loaded with correct headers');
    
    // At least one ROLE_ASSIGNED or ROLE_REMOVED row - strong wait
    const anyRoleEvent = await waitForElementVisible(
      driver,
      By.xpath("//*[contains(.,'ROLE_ASSIGNED') or contains(.,'ROLE_REMOVED')]"),
      20000
    );
    expect(await anyRoleEvent.isDisplayed()).to.eq(true);
    
    console.log('✓ Found role assignment/removal events');
  });
});

