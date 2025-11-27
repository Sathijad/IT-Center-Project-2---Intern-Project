import { By, until, type WebDriver } from 'selenium-webdriver'
import { getBaseUrl } from '../helpers/test-base.js'

const logInfo = (message: string) => {
  console.log(`[TasksPage] ${message}`)
}

const toDateOnly = (date: Date) => {
  // Format for date input (YYYY-MM-DD in local time)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const formatted = `${year}-${month}-${day}`
  logInfo(`Formatting date: ${date.toISOString()} -> ${formatted}`)
  return formatted
}

export class TasksPage {
  private readonly baseUrl = getBaseUrl()
  private driver: WebDriver

  constructor(driver: WebDriver) {
    this.driver = driver
  }

  async open(): Promise<void> {
    await this.driver.get(`${this.baseUrl}/tasks`)
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(),'Task Dashboard')]")),
      20000,
    )
  }

  async isAssignFormVisible(): Promise<boolean> {
    const forms = await this.driver.findElements(By.xpath("//form[contains(.,'Assign Task')]"))
    return forms.length > 0
  }

  async isEmployeeNoticeVisible(): Promise<boolean> {
    const notices = await this.driver.findElements(
      By.xpath("//*[contains(text(),'Showing your tasks only')]"),
    )
    if (notices.length === 0) {
      return false
    }
    return notices[0].isDisplayed()
  }

  async setStatusFilter(status: string): Promise<void> {
    const select = await this.driver.findElement(
      By.xpath("//section[contains(.,'Filters')]//label[contains(.,'Status')]//select"),
    )
    await select.sendKeys(status)
  }

  async setAssigneeFilter(value: string): Promise<void> {
    const inputs = await this.driver.findElements(
      By.xpath("//section[contains(.,'Filters')]//label[contains(.,'Assignee ID')]//input"),
    )
    if (inputs.length > 0) {
      await inputs[0].clear()
      await inputs[0].sendKeys(value)
    }
  }

  async ensureFilters(status: string, assigneeId: number): Promise<void> {
    logInfo(`Applying task filters -> status: ${status || 'All'}, assigneeId: ${assigneeId}`)
    await this.setStatusFilter(status)
    await this.setAssigneeFilter(String(assigneeId))
    await this.driver.sleep(500)
  }

  async createTask(options: {
    title: string
    description: string
    assigneeId: number
    scheduleId?: string
    priority?: string
    dueDate?: Date
    tags?: string
  }): Promise<void> {
    const form = await this.driver.findElement(By.xpath("//form[contains(.,'Assign Task')]"))

    const fillInput = async (selector: string, value: string) => {
      const input = await form.findElement(By.css(selector))
      await input.clear()
      await input.sendKeys(value)
    }

    await fillInput("input[name='title']", options.title)
    await fillInput("textarea[name='description']", options.description)
    await fillInput("input[name='assigneeId']", String(options.assigneeId))

    if (options.scheduleId) {
      await fillInput("input[name='scheduleId']", options.scheduleId)
    }

    if (options.priority) {
      const select = await form.findElement(By.css("select[name='priority']"))
      await select.sendKeys(options.priority)
    }

    if (options.dueDate) {
      await fillInput("input[name='dueDate']", toDateOnly(options.dueDate))
    }

    if (options.tags) {
      await fillInput("input[name='tags']", options.tags)
    }

    const submit = await form.findElement(By.css('button[type="submit"]'))
    
    // Check if button is enabled before clicking
    const isEnabled = await submit.isEnabled()
    if (!isEnabled) {
      throw new Error('Submit button is disabled')
    }
    
    logInfo('Clicking submit button...')
    await submit.click()
    
    // Wait for form to disappear or success/error message
    try {
      // Wait for form to become stale (disappear from DOM)
      await this.driver.wait(
        until.stalenessOf(form),
        15000,
        'Form did not disappear after submission'
      )
      logInfo('Form disappeared, submission appears successful')
    } catch (e) {
      // Form might still be visible, check for errors or success messages
      const errorElements = await this.driver.findElements(By.css('.text-red-500, .text-destructive, [role="alert"], .error, [class*="error"]'))
      if (errorElements.length > 0) {
        const errorText = await errorElements[0].getText()
        throw new Error(`Task creation failed: ${errorText}`)
      }
      
      // Check for success messages
      const successElements = await this.driver.findElements(By.css('.text-green-500, .text-success, [class*="success"], [role="status"]'))
      if (successElements.length > 0) {
        logInfo('Success message found, continuing...')
      } else {
        logInfo('No clear success/error message, waiting for async operations...')
        await this.driver.sleep(3000)
      }
    }
    
    // Additional wait for API call to complete and UI to update
    await this.driver.sleep(3000)
  }

  async waitForTask(title: string): Promise<void> {
    logInfo(`Waiting for task with title: "${title}"`)

    await this.driver.wait(
      async () => {
        const selectors = [
          By.xpath(`//article[.//p[contains(normalize-space(),"${title}")]]`),
          By.xpath(`//article[.//*[contains(text(),"${title}")]]`),
          By.xpath(`//*[contains(text(),"${title}")]`),
        ]

        for (const selector of selectors) {
          const elements = await this.driver.findElements(selector)
          if (elements.length > 0) {
            logInfo(`Task "${title}" located`)
            return true
          }
        }

        return false
      },
      45000,
      `Task with title "${title}" not found`,
    )
  }

  async changeStatus(title: string, status: string): Promise<void> {
    const article = await this.driver.findElement(
      By.xpath(`//article[.//p[contains(normalize-space(),"${title}")]]`),
    )
    const select = await article.findElement(By.css('select'))
    await select.sendKeys(status)
  }

  async addComment(title: string, comment: string): Promise<void> {
    const article = await this.driver.findElement(
      By.xpath(`//article[.//p[contains(normalize-space(),"${title}")]]`),
    )
    const input = await article.findElement(By.css('input[placeholder*="Keep everyone"]'))
    await input.clear()
    await input.sendKeys(comment)
    const button = await article.findElement(By.xpath(".//button[contains(text(),'Send')]"))
    await button.click()
    await this.driver.wait(async () => {
      const value = await input.getAttribute('value')
      return value.length === 0
    }, 10000)
  }

  async getVisibleTaskTitles(): Promise<string[]> {
    const cards = await this.driver.findElements(By.css('article p.text-base'))
    const titles: string[] = []
    for (const card of cards) {
      titles.push((await card.getText()).trim())
    }
    return titles
  }
}


