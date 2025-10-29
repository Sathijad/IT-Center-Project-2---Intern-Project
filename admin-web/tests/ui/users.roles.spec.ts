import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { WebDriver, By, until } from 'selenium-webdriver';
import { createDriver, seedAuthToken, waitForPageLoad, getBaseUrl, waitForElementVisible } from './helpers/test-base.js';
import { UsersPage } from './page-objects/UsersPage.js';

describe('User Role Management', function() {
  this.timeout(120000); // 2 minutes timeout for entire suite
  
  let driver: WebDriver;
  let usersPage: UsersPage;
  const testEmail = 'user1@itcenter.com'; // Use a test user from mock data
  const baseUrl = getBaseUrl();

  before(async () => {
    driver = await createDriver();
    usersPage = new UsersPage(driver);
    
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

  it('should open Users page and list users', async () => {
    await driver.get(`${baseUrl}/users`);
    
    // Wait for page title or header
    try {
      await waitForElementVisible(
        driver,
        By.xpath("//h1[contains(text(), 'Users')]"),
        30000
      );
    } catch (error) {
      // Check if redirected to login (auth not satisfied)
      const currentUrl = await driver.getCurrentUrl();
      if (currentUrl.includes('/login')) {
        throw new Error('Users title not visible — redirected to login (auth not satisfied). Make sure json-server is running on port 5050 and VITE_API_BASE_URL=http://localhost:5050');
      }
      throw error;
    }
    
    // Wait for loading spinner to disappear
    await driver.wait(async () => {
      const spinners = await driver.findElements(By.css('.animate-spin'));
      return spinners.length === 0;
    }, 25000);
    
    // Check if we got "No users found" message - this would indicate a data format issue
    const emptyStateElements = await driver.findElements(By.xpath("//*[contains(text(), 'No users found')]"));
    if (emptyStateElements.length > 0) {
      const emptyState = emptyStateElements[0];
      if (await emptyState.isDisplayed()) {
        // Debug: log the page source to see what's happening
        const pageSource = await driver.getPageSource();
        console.error('Page shows "No users found". Page snippet:', pageSource.substring(0, 2000));
        throw new Error('API returned data but component shows "No users found" - check response format');
      }
    }
    
    // Wait for the table to appear
    await driver.wait(
      until.elementLocated(By.css('table')),
      20000
    );
    
    // Wait a bit more for React Query to finish rendering
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify stubbed users are visible - strong wait
    const user1 = await waitForElementVisible(
      driver,
      By.xpath("//*[contains(text(),'user1@itcenter.com')]"),
      20000
    );
    expect(await user1.isDisplayed()).to.eq(true);
    
    console.log('✓ Users page loaded and user1@itcenter.com is visible');
  });

  it('should open user detail page from users list', async () => {
    await driver.get(`${baseUrl}/users`);
    
    // Wait for loading to complete
    try {
      await driver.wait(async () => {
        const spinners = await driver.findElements(By.css('.animate-spin'));
        return spinners.length === 0;
      }, 15000);
    } catch {
      // No spinner found or already gone, continue
    }
    
    // Wait for table and data to load
    await driver.wait(
      until.elementLocated(By.css('table')),
      20000
    );
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Wait for page to load
    await waitForElementVisible(
      driver,
      By.xpath("//*[contains(text(),'user1@itcenter.com')]"),
      20000
    );
    
    // Look for View button - prefer data-testid, fallback to text
    let viewBtn;
    try {
      viewBtn = await waitForElementVisible(
        driver,
        By.css('[data-testid="user-view-btn"]'),
        10000
      );
    } catch {
      viewBtn = await waitForElementVisible(
        driver,
        By.xpath("//button[contains(.,'View')]"),
        10000
      );
    }
    
    await viewBtn.click();
    
    // Wait for navigation to detail page
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Wait for detail page content (name or email)
    const detail = await waitForElementVisible(
      driver,
      By.xpath("//*[contains(.,'User One') or contains(.,'user1@itcenter.com')]"),
      20000
    );
    expect(await detail.isDisplayed()).to.eq(true);
    
    // Verify URL contains /users/
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).to.include('/users/');
    
    console.log('✓ User detail page opened successfully');
    
    // Navigate back
    await driver.navigate().back();
  });
});

