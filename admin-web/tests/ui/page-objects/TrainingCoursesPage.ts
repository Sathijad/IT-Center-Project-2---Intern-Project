import { WebDriver, By, until } from 'selenium-webdriver';
import { getBaseUrl } from '../helpers/test-base.js';

export class TrainingCoursesPage {
  constructor(private driver: WebDriver) {}

  async open(): Promise<void> {
    const baseUrl = getBaseUrl();
    await this.driver.get(`${baseUrl}/training/courses`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Training Courses')]")),
      15000
    );
  }

  async isDisplayed(): Promise<boolean> {
    try {
      const title = await this.driver.findElement(
        By.xpath("//h1[contains(text(), 'Training Courses')]")
      );
      return await title.isDisplayed();
    } catch {
      return false;
    }
  }

  async clickNewCourse(): Promise<void> {
    const button = await this.driver.findElement(
      By.xpath("//button[contains(text(), 'New Course')]")
    );
    await button.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async isCreateModalVisible(): Promise<boolean> {
    try {
      const modal = await this.driver.findElement(
        By.xpath("//h2[contains(text(), 'Create Training Course')]")
      );
      return await modal.isDisplayed();
    } catch {
      return false;
    }
  }

  async setTitle(title: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Title')]/following-sibling::input")
    );
    await input.clear();
    await input.sendKeys(title);
  }

  async setDescription(description: string): Promise<void> {
    const textarea = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Description')]/following-sibling::textarea")
    );
    await textarea.clear();
    await textarea.sendKeys(description);
  }

  async setProvider(provider: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Provider')]/following-sibling::input")
    );
    await input.clear();
    await input.sendKeys(provider);
  }

  async setModality(modality: string): Promise<void> {
    const select = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Modality')]/following-sibling::select")
    );
    await this.driver.executeScript(
      `arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('change', { bubbles: true }));`,
      select,
      modality
    );
  }

  async setDurationMinutes(minutes: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Duration')]/following-sibling::input[@type='number']")
    );
    await input.clear();
    await input.sendKeys(minutes);
  }

  async setTeamsMeetingUrl(url: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//label[contains(text(), 'Teams Meeting URL')]/following-sibling::input")
    );
    await input.clear();
    await input.sendKeys(url);
  }

  async clickCreateCourse(): Promise<void> {
    // Find button inside the Create Training Course modal
    const button = await this.driver.findElement(
      By.xpath("//h2[contains(text(), 'Create Training Course')]/ancestor::div[contains(@class, 'bg-white')]//button[contains(text(), 'Create Course')]")
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
    
    // Use JavaScript click for reliability
    await this.driver.executeScript('arguments[0].click();', button);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async clickCancel(): Promise<void> {
    // Find cancel button in the currently visible modal (Create or Edit)
    let button;
    try {
      button = await this.driver.findElement(
        By.xpath("//h2[contains(text(), 'Create Training Course')]/ancestor::div[contains(@class, 'bg-white')]//button[contains(text(), 'Cancel')]")
      );
    } catch {
      try {
        button = await this.driver.findElement(
          By.xpath("//h2[contains(text(), 'Edit Training Course')]/ancestor::div[contains(@class, 'bg-white')]//button[contains(text(), 'Cancel')]")
        );
      } catch {
        // Fallback
        button = await this.driver.findElement(
          By.xpath("//button[contains(text(), 'Cancel')]")
        );
      }
    }
    // Use JavaScript click for reliability
    await this.driver.executeScript('arguments[0].click();', button);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async searchCourses(query: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//input[@placeholder='Search courses...']")
    );
    await input.clear();
    await input.sendKeys(query);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async getCourseCount(): Promise<number> {
    try {
      const rows = await this.driver.findElements(
        By.xpath("//table//tbody//tr")
      );
      return rows.length;
    } catch {
      return 0;
    }
  }

  async clickEditCourse(index: number = 0): Promise<void> {
    const editButtons = await this.driver.findElements(
      By.xpath("//button[contains(text(), 'Edit')]")
    );
    if (editButtons.length > index) {
      await editButtons[index].click();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async isEditModalVisible(): Promise<boolean> {
    try {
      const modal = await this.driver.findElement(
        By.xpath("//h2[contains(text(), 'Edit Training Course')]")
      );
      return await modal.isDisplayed();
    } catch {
      return false;
    }
  }

  async clickUpdateCourse(): Promise<void> {
    // Find button inside the Edit Training Course modal
    const button = await this.driver.findElement(
      By.xpath("//h2[contains(text(), 'Edit Training Course')]/ancestor::div[contains(@class, 'bg-white')]//button[contains(text(), 'Update Course')]")
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
    
    // Use JavaScript click for reliability
    await this.driver.executeScript('arguments[0].click();', button);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

