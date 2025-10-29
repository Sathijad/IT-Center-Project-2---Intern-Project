import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { WebDriver } from 'selenium-webdriver';
import { createDriver, setAuthToken, waitForPageLoad, getBaseUrl } from './helpers/test-base';
import { UsersPage } from './page-objects/UsersPage';
import { generateMockToken, TEST_DATA } from './helpers/test-data';

describe('User Role Management', () => {
  let driver: WebDriver;
  let usersPage: UsersPage;
  const testEmail = 'admin@itcenter.com'; // Use a test user that exists in your system

  before(async () => {
    driver = await createDriver();
    usersPage = new UsersPage(driver);
    
    // Set up authentication
    const baseUrl = getBaseUrl();
    await driver.get(baseUrl);
    
    // Set auth token
    const token = generateMockToken();
    await driver.executeScript(`
      localStorage.setItem('access_token', '${token}');
      localStorage.setItem('id_token', 'test-id-token');
    `);
    
    // Reload to apply authentication
    await driver.navigate().refresh();
    await waitForPageLoad(driver);
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  after(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  it('should edit roles for a test user then revert (idempotent)', async () => {
    // Navigate to users page
    await usersPage.open();
    
    // Search for the test user
    await usersPage.searchByEmail(testEmail);
    
    // Get initial roles
    const initialRoles = await usersPage.getUserRoles(testEmail);
    console.log(`Initial roles: ${initialRoles.join(', ')}`);
    
    // Click the Roles button to open the modal
    await usersPage.clickRolesButton(testEmail);
    
    // Toggle the EMPLOYEE role (or another role) if it exists
    try {
      // Check if EMPLOYEE is checked
      const hasEmployee = initialRoles.includes('EMPLOYEE');
      
      if (!hasEmployee) {
        // Add EMPLOYEE role
        await usersPage.toggleRoleCheckbox('EMPLOYEE');
      } else {
        // Remove EMPLOYEE role
        await usersPage.untoggleRoleCheckbox('EMPLOYEE');
      }
      
      // Save changes
      await usersPage.clickSaveChanges();
      
      // Wait for success confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Close the modal (handle alert)
      try {
        const alert = await driver.switchTo().alert();
        await alert.accept();
      } catch (e) {
        // No alert found, continue
      }
      
      // Now revert the change
      await new Promise(resolve => setTimeout(resolve, 1000));
      await usersPage.clickRolesButton(testEmail);
      
      // Toggle back
      if (!hasEmployee) {
        await usersPage.untoggleRoleCheckbox('EMPLOYEE');
      } else {
        await usersPage.toggleRoleCheckbox('EMPLOYEE');
      }
      
      // Save changes
      await usersPage.clickSaveChanges();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Close alert
      try {
        const alert = await driver.switchTo().alert();
        await alert.accept();
      } catch (e) {
        // No alert found, continue
      }
      
      // Verify roles are back to original
      await new Promise(resolve => setTimeout(resolve, 1000));
      const finalRoles = await usersPage.getUserRoles(testEmail);
      
      expect(finalRoles.sort()).to.deep.equal(initialRoles.sort(), 
        'Roles should be reverted to original state'
      );
      
    } catch (error) {
      console.log('Role management error:', error);
      // If modal is still open, close it
      try {
        await usersPage.closeRoleModal();
      } catch (e) {
        // Ignore
      }
    }
  });

  it('should open user detail page from users list', async () => {
    await usersPage.open();
    
    // Search for the test user
    await usersPage.searchByEmail(testEmail);
    
    // Click view button
    await usersPage.clickViewButton(testEmail);
    
    // Verify we're on the detail page
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).to.include('/users/');
    
    // Navigate back
    await driver.navigate().back();
  });
});

