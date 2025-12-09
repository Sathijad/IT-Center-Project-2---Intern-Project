import { WebDriver, By, until } from 'selenium-webdriver';
import { getBaseUrl } from '../helpers/test-base.js';

export class KpiTargetsPage {
  constructor(private driver: WebDriver) {}

  async open(): Promise<void> {
    const baseUrl = getBaseUrl();
    await this.driver.get(`${baseUrl}/performance/targets`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'KPI Targets')]")),
      15000
    );
  }

  async isDisplayed(): Promise<boolean> {
    try {
      const title = await this.driver.findElement(
        By.xpath("//h1[contains(text(), 'KPI Targets')]")
      );
      return await title.isDisplayed();
    } catch {
      return false;
    }
  }

  async clickCreateTarget(): Promise<void> {
    const button = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Create Target')]")
    );
    await button.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async clickCreateKpi(): Promise<void> {
    const button = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'Create KPI')]")
    );
    await button.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async isCreateTargetModalVisible(): Promise<boolean> {
    try {
      const modal = await this.driver.findElement(
        By.xpath("//h2[contains(text(), 'Create KPI Target')]")
      );
      return await modal.isDisplayed();
    } catch {
      return false;
    }
  }

  async isCreateKpiModalVisible(): Promise<boolean> {
    try {
      const modal = await this.driver.findElement(
        By.xpath("//h2[contains(text(), 'Create New KPI')]")
      );
      return await modal.isDisplayed();
    } catch {
      return false;
    }
  }

  async selectKpi(kpiName: string): Promise<void> {
    const select = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'KPI')]/following-sibling::select")
    );
    await this.driver.executeScript(
      `const select = arguments[0]; const option = Array.from(select.options).find(opt => opt.text.includes(arguments[1])); if (option) { select.value = option.value; select.dispatchEvent(new Event('change', { bubbles: true })); }`,
      select,
      kpiName
    );
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async setPeriodType(periodType: string): Promise<void> {
    const select = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Period Type')]/following-sibling::select")
    );
    await this.driver.executeScript(
      `arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('change', { bubbles: true }));`,
      select,
      periodType
    );
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async setPeriodStart(date: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Period Start')]/following-sibling::input[@type='date']")
    );
    await input.clear();
    await input.sendKeys(date);
  }

  async setPeriodEnd(date: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Period End')]/following-sibling::input[@type='date']")
    );
    await input.clear();
    await input.sendKeys(date);
  }

  async setTargetValue(value: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Target Value')]/following-sibling::div//input[@type='number']")
    );
    await input.clear();
    await input.sendKeys(value);
  }

  async setUserId(userId: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'User ID')]/following-sibling::input[@type='number']")
    );
    await input.clear();
    if (userId) {
      await input.sendKeys(userId);
    }
  }

  async setTeamId(teamId: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Team ID')]/following-sibling::input[@type='number']")
    );
    await input.clear();
    if (teamId) {
      await input.sendKeys(teamId);
    }
  }

  async clickCreateTargetButton(): Promise<void> {
    // Wait for modal to be fully visible first
    await this.driver.wait(
      async () => {
        try {
          const modal = await this.driver.findElement(
            By.xpath("//h2[contains(text(), 'Create KPI Target')]")
          );
          return await modal.isDisplayed();
        } catch {
          return false;
        }
      },
      5000
    );
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Find button inside the Create Target modal
    const button = await this.driver.findElement(
      By.xpath("//h2[contains(text(), 'Create KPI Target')]/ancestor::div[contains(@class, 'bg-white')]//button[contains(text(), 'Create Target') and not(contains(text(), 'KPI')) and contains(@class, 'bg-blue-600')]")
    );
    
    // Verify button is visible and enabled
    await this.driver.wait(async () => {
      try {
        const isDisplayed = await button.isDisplayed();
        const isEnabled = await button.isEnabled();
        return isDisplayed && isEnabled;
      } catch {
        return false;
      }
    }, 5000);
    
    // Scroll into view
    await this.driver.executeScript('arguments[0].scrollIntoView({block: "center", behavior: "instant"});', button);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Try regular click first, fallback to JavaScript click
    try {
      await button.click();
    } catch (error) {
      await this.driver.executeScript('arguments[0].click();', button);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async clickCancel(): Promise<void> {
    // Find cancel button in the currently visible modal
    // Try to find it in Create KPI modal first, then Create Target modal
    let button;
    try {
      button = await this.driver.findElement(
        By.xpath("//h2[contains(text(), 'Create New KPI')]/ancestor::div[contains(@class, 'bg-white')]//button[contains(text(), 'Cancel')]")
      );
    } catch {
      try {
        button = await this.driver.findElement(
          By.xpath("//h2[contains(text(), 'Create KPI Target')]/ancestor::div[contains(@class, 'bg-white')]//button[contains(text(), 'Cancel')]")
        );
      } catch {
        // Fallback to any cancel button
        button = await this.driver.findElement(
          By.xpath("//button[contains(text(), 'Cancel')]")
        );
      }
    }
    
    // Use JavaScript click for reliability
    await this.driver.executeScript('arguments[0].click();', button);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // KPI Creation methods
  async setKpiCode(code: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'KPI Code')]/following-sibling::input")
    );
    await input.clear();
    await input.sendKeys(code);
  }

  async setKpiName(name: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'KPI Name')]/following-sibling::input")
    );
    await input.clear();
    await input.sendKeys(name);
  }

  async setKpiDescription(description: string): Promise<void> {
    const textarea = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Description')]/following-sibling::textarea")
    );
    await textarea.clear();
    await textarea.sendKeys(description);
  }

  async setKpiUnit(unit: string): Promise<void> {
    const select = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Unit')]/following-sibling::select")
    );
    await this.driver.executeScript(
      `arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('change', { bubbles: true }));`,
      select,
      unit
    );
  }

  async setKpiCategory(category: string): Promise<void> {
    const select = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Category')]/following-sibling::select")
    );
    await this.driver.executeScript(
      `arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('change', { bubbles: true }));`,
      select,
      category
    );
  }

  async clickCreateKpiButton(): Promise<void> {
    // Wait for modal to be fully visible first
    await this.driver.wait(
      async () => {
        try {
          const modal = await this.driver.findElement(
            By.xpath("//h2[contains(text(), 'Create New KPI')]")
          );
          return await modal.isDisplayed();
        } catch {
          return false;
        }
      },
      5000
    );
    
    // Wait a bit more for modal animation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Find the button specifically inside the Create KPI modal
    // Look for button with text "Create KPI" that is inside a div containing "Create New KPI" heading
    // The modal structure: h2 -> parent div -> sibling div with buttons
    const button = await this.driver.findElement(
      By.xpath("//h2[contains(text(), 'Create New KPI')]/ancestor::div[contains(@class, 'bg-white')]//button[contains(text(), 'Create KPI') and not(contains(text(), 'New')) and contains(@class, 'bg-green-700')]")
    );
    
    // Verify button is visible and enabled
    await this.driver.wait(async () => {
      try {
        const isDisplayed = await button.isDisplayed();
        const isEnabled = await button.isEnabled();
        return isDisplayed && isEnabled;
      } catch {
        return false;
      }
    }, 5000);
    
    // Scroll into view and use JavaScript click to avoid overlay interception
    await this.driver.executeScript('arguments[0].scrollIntoView({block: "center", behavior: "instant"});', button);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Try regular click first, fallback to JavaScript click
    try {
      await button.click();
    } catch (error) {
      // If regular click fails, use JavaScript click
      await this.driver.executeScript('arguments[0].click();', button);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

