import { WebDriver, By, until, Key } from 'selenium-webdriver';
import { getBaseUrl } from '../helpers/test-base';

export class UsersPage {
  constructor(private driver: WebDriver) {}

  async open(): Promise<void> {
    const baseUrl = getBaseUrl();
    await this.driver.get(`${baseUrl}/users`);
    
    // Wait for the users page to load
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Users')]")),
      10000
    );
  }

  async searchByEmail(email: string): Promise<void> {
    // Wait for search input
    const searchInput = await this.driver.wait(
      until.elementLocated(By.xpath("//input[@placeholder='Search by email or name...']")),
      10000
    );
    
    await searchInput.clear();
    await searchInput.sendKeys(email);
    
    // Wait for results to load
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  async clickViewButton(email: string): Promise<void> {
    // Find the row with the email and click the View button
    const row = await this.driver.wait(
      until.elementLocated(
        By.xpath(`//tr[.//div[contains(text(), '${email}')]]//button[contains(text(), 'View')]`)
      ),
      10000
    );
    await row.click();
    
    // Wait for navigation
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'User Details')]")),
      10000
    );
  }

  async clickRolesButton(email: string): Promise<void> {
    // Find the row with the email and click the Roles button
    const row = await this.driver.wait(
      until.elementLocated(
        By.xpath(`//tr[.//div[contains(text(), '${email}')]]//button[contains(text(), 'Roles')]`)
      ),
      10000
    );
    await row.click();
    
    // Wait for role modal to appear
    await this.driver.wait(
      until.elementLocated(By.xpath("//h2[contains(text(), 'Manage Roles')]")),
      10000
    );
  }

  async toggleRoleCheckbox(role: string): Promise<void> {
    const checkbox = await this.driver.wait(
      until.elementLocated(
        By.xpath(`//label[.//span[contains(text(), '${role}')]]//input[@type='checkbox']`)
      ),
      10000
    );
    
    const isChecked = await checkbox.isSelected();
    if (!isChecked) {
      await checkbox.click();
    }
  }

  async untoggleRoleCheckbox(role: string): Promise<void> {
    const checkbox = await this.driver.wait(
      until.elementLocated(
        By.xpath(`//label[.//span[contains(text(), '${role}')]]//input[@type='checkbox']`)
      ),
      10000
    );
    
    const isChecked = await checkbox.isSelected();
    if (isChecked) {
      await checkbox.click();
    }
  }

  async clickSaveChanges(): Promise<void> {
    const saveButton = await this.driver.wait(
      until.elementLocated(By.xpath("//button[contains(text(), 'Save Changes')]")),
      5000
    );
    await saveButton.click();
  }

  async waitForSuccessToast(): Promise<boolean> {
    try {
      // Wait for alert dialog to appear (the app uses alert() for success messages)
      await this.driver.wait(async () => {
        try {
          // Try to find alert text in the DOM
          const alertText = await this.driver.executeScript(
            'return document.querySelector(".alert")?.textContent || ""'
          );
          return alertText.includes('success') || alertText.includes('updated');
        } catch {
          return false;
        }
      }, 5000);
      return true;
    } catch {
      return false;
    }
  }

  async clickCancel(): Promise<void> {
    const cancelButton = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Cancel')]")
    );
    await cancelButton.click();
  }

  async closeRoleModal(): Promise<void> {
    // Click outside the modal or press ESC
    await this.driver.actions().sendKeys(Key.ESCAPE).perform();
  }

  async getUserRoles(email: string): Promise<string[]> {
    const row = await this.driver.findElement(
      By.xpath(`//tr[.//div[contains(text(), '${email}')]]`)
    );
    
    const roleElements = await row.findElements(By.css('span[class*="bg-blue-100"]'));
    const roles: string[] = [];
    
    for (const roleElement of roleElements) {
      const roleText = await roleElement.getText();
      roles.push(roleText.trim());
    }
    
    return roles;
  }

  async waitForModalClose(): Promise<void> {
    try {
      await this.driver.wait(
        until.stalenessOf(
          await this.driver.findElement(By.xpath("//h2[contains(text(), 'Manage Roles')]"))
        ),
        5000
      );
    } catch {
      // Modal already closed or not found
    }
  }
}

