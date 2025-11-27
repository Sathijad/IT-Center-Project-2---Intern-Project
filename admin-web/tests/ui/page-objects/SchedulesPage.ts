import { By, until, type WebDriver } from 'selenium-webdriver'
import { getBaseUrl } from '../helpers/test-base.js'

const logInfo = (message: string) => {
  console.log(`[SchedulesPage] ${message}`)
}

const toDateInput = (date: Date) => {
  // Format for datetime-local input (YYYY-MM-DDTHH:mm in local time)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const formatted = `${year}-${month}-${day}T${hours}:${minutes}`
  logInfo(`Formatting date: ${date.toISOString()} -> ${formatted}`)
  return formatted
}

const formatFilterDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export class SchedulesPage {
  private readonly baseUrl = getBaseUrl()
  private driver: WebDriver

  constructor(driver: WebDriver) {
    this.driver = driver
  }

  async openPlanner(): Promise<void> {
    await this.driver.get(`${this.baseUrl}/schedules`)
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(),'Weekly Schedule Planner')]")),
      20000,
    )
  }

  async openMySchedule(): Promise<void> {
    await this.driver.get(`${this.baseUrl}/schedules/my`)
    await this.driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(),'My Schedule')]")),
      20000,
    )
  }

  async createSchedule(options: {
    userId: number
    teamId?: number
    title: string
    description?: string
    start: Date
    end: Date
    allDay?: boolean
  }): Promise<void> {
    const form = await this.driver.findElement(By.xpath("//form[contains(.,'Create Schedule')]"))

    const fillInput = async (selector: string, value: string) => {
      const input = await form.findElement(By.css(selector))
      await input.clear()
      await input.sendKeys(value)
    }

    await fillInput("input[name='userId']", String(options.userId))
    if (typeof options.teamId === 'number') {
      await fillInput("input[name='teamId']", String(options.teamId))
    }
    await fillInput("input[name='title']", options.title)
    if (options.description) {
      await fillInput("textarea[name='description']", options.description)
    }
    await fillInput("input[name='startTime']", toDateInput(options.start))
    await fillInput("input[name='endTime']", toDateInput(options.end))

    if (options.allDay) {
      const checkbox = await form.findElement(By.css("input[name='isAllDay']"))
      const isChecked = await checkbox.isSelected()
      if (!isChecked) {
        await checkbox.click()
      }
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
        throw new Error(`Schedule creation failed: ${errorText}`)
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

  async waitForSchedule(title: string): Promise<void> {
    logInfo(`Waiting for schedule with title: "${title}"`)

    await this.driver.wait(
      async () => {
        const selectors = [
          By.xpath(`//tbody//tr[.//td[contains(normalize-space(),"${title}")]]`),
          By.xpath(`//tr[.//*[contains(text(),"${title}")]]`),
          By.xpath(`//*[contains(text(),"${title}")]`),
        ]

        for (const selector of selectors) {
          const elements = await this.driver.findElements(selector)
          if (elements.length > 0) {
            logInfo(`Schedule "${title}" located`)
            return true
          }
        }

        return false
      },
      45000,
      `Schedule with title "${title}" not found`,
    )
  }

  async getRecordCount(): Promise<number> {
    const badge = await this.driver.findElement(
      By.xpath("//h2[contains(text(),'Upcoming schedules')]/following-sibling::span"),
    )
    const text = await badge.getText()
    const match = text.match(/(\d+)/)
    return match ? Number(match[1]) : 0
  }

  async filterByUser(userId: string): Promise<void> {
    const input = await this.driver.findElement(
      By.xpath("//section[contains(.,'Filters')]//label[contains(.,'User ID')]//input"),
    )
    await input.clear()
    await input.sendKeys(userId)
  }

  async clearUserFilter(): Promise<void> {
    await this.filterByUser('')
  }

  async setDateRange(start: Date, end: Date): Promise<void> {
    const formattedStart = formatFilterDate(start)
    const formattedEnd = formatFilterDate(end)

    const startInput = await this.driver.findElement(
      By.xpath("//section[contains(.,'Filters')]//label[contains(.,'Range Start')]//input"),
    )
    await startInput.clear()
    await startInput.sendKeys(formattedStart)

    const endInput = await this.driver.findElement(
      By.xpath("//section[contains(.,'Filters')]//label[contains(.,'Range End')]//input"),
    )
    await endInput.clear()
    await endInput.sendKeys(formattedEnd)
  }

  async ensureFilters(userId: number, start: Date, end: Date): Promise<void> {
    logInfo(`Applying filters -> userId: ${userId}, start: ${start.toISOString()}, end: ${end.toISOString()}`)
    await this.filterByUser(String(userId))
    await this.setDateRange(start, end)
    // give React time to trigger refetch
    await this.driver.sleep(500)
  }

  async getVisibleUserIds(): Promise<number[]> {
    const cells = await this.driver.findElements(By.css('tbody tr td:first-child'))
    const ids: number[] = []
    for (const cell of cells) {
      const text = (await cell.getText()).trim()
      if (text) {
        ids.push(Number(text))
      }
    }
    return ids
  }

  async getMyScheduleTitles(): Promise<string[]> {
    const cards = await this.driver.findElements(By.css('article p.text-base'))
    const titles: string[] = []
    for (const card of cards) {
      titles.push((await card.getText()).trim())
    }
    return titles
  }
}


