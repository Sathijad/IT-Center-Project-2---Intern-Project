import { describe, it, before, after } from 'mocha'
import { expect } from 'chai'
import { By, until, type WebDriver } from 'selenium-webdriver'
import { createDriver, getBaseUrl, waitForPageLoad } from './helpers/test-base.js'
import { LoginPage } from './page-objects/LoginPage.js'
import { SchedulesPage } from './page-objects/SchedulesPage.js'
import { TasksPage } from './page-objects/TasksPage.js'

const adminEmail = process.env.TEST_LOGIN_EMAIL || 'admin@test.com'
const adminPassword = process.env.TEST_LOGIN_PASSWORD || 'Admin@123'
const scheduleUserId = Number(process.env.TEST_SCHEDULE_USER_ID || '101')
const scheduleTeamId = process.env.TEST_TEAM_ID ? Number(process.env.TEST_TEAM_ID) : undefined
const taskAssigneeId = Number(process.env.TEST_TASK_ASSIGNEE_ID || scheduleUserId)

const hoursFromNow = (hrs: number) => new Date(Date.now() + hrs * 60 * 60 * 1000)

const logInfo = (message: string) => {
  console.log(`[phase4-tests] ${message}`)
}

const fillInputIfPresent = async (
  driver: WebDriver,
  locators: By[],
  value: string,
): Promise<boolean> => {
  for (const locator of locators) {
    const elements = await driver.findElements(locator)
    if (elements.length > 0) {
      await elements[0].clear()
      await elements[0].sendKeys(value)
      return true
    }
  }
  return false
}

const clickIfPresent = async (driver: WebDriver, locators: By[]): Promise<boolean> => {
  for (const locator of locators) {
    const elements = await driver.findElements(locator)
    if (elements.length > 0) {
      await elements[0].click()
      return true
    }
  }
  return false
}

const switchToLatestWindow = async (driver: WebDriver) => {
  const handles = await driver.getAllWindowHandles()
  await driver.switchTo().window(handles[handles.length - 1])
}

describe('Phase 4 - Schedules & Tasks UI Automation', function () {
  this.timeout(240000)

  let driver: WebDriver
  let loginPage: LoginPage
  let schedulesPage: SchedulesPage
  let tasksPage: TasksPage
  const baseUrl = getBaseUrl()

const performInteractiveLogin = async () => {
    await loginPage.open()
    await loginPage.clickSignInWithCognito()

    await switchToLatestWindow(driver)
    logInfo('Filling Cognito sign-in form with provided credentials')

    // Step 1: Enter email
    await driver.wait(
      until.elementLocated(By.css('input[type="email"], input[name="username"], input#username, input[name="email"]')),
      30000,
      'Email/username field not found'
    )

    const usernameFilled = await fillInputIfPresent(driver, [
      By.id('username'),
      By.name('username'),
      By.css('input[type="email"]'),
      By.css('input[name="email"]'),
    ], adminEmail)

    if (!usernameFilled) {
      throw new Error('Unable to locate username/email field on Cognito sign-in page')
    }

    logInfo('Email entered, clicking Next button')

    // Click Next button after email
    const emailNextClicked = await clickIfPresent(driver, [
      By.id('next'),
      By.name('next'),
      By.css('button[type="submit"]'),
      By.xpath("//button[contains(text(),'Next') or contains(text(),'next')]"),
      By.xpath("//input[@type='submit' and (@value='Next' or @value='next')]"),
    ])

    if (!emailNextClicked) {
      throw new Error('Unable to locate Next button after email entry')
    }

    // Step 2: Wait for password field and enter password
    await driver.wait(
      until.elementLocated(By.css('input[type="password"], input[name="password"], input#password')),
      30000,
      'Password field not found after clicking Next'
    )

    logInfo('Password field appeared, entering password')

    const passwordFilled = await fillInputIfPresent(driver, [
      By.id('password'),
      By.name('password'),
      By.css('input[type="password"]'),
    ], adminPassword)

    if (!passwordFilled) {
      throw new Error('Unable to locate password field on Cognito sign-in page')
    }

    logInfo('Password entered, clicking Next button')

    // Click Next button after password
    const passwordNextClicked = await clickIfPresent(driver, [
      By.id('next'),
      By.name('next'),
      By.css('button[type="submit"]'),
      By.xpath("//button[contains(text(),'Next') or contains(text(),'next')]"),
      By.xpath("//input[@type='submit' and (@value='Next' or @value='next')]"),
    ])

    if (!passwordNextClicked) {
      throw new Error('Unable to locate Next button after password entry')
    }

  logInfo('Waiting for manual verification code entry... please complete MFA to continue.')

  let appHandle: string | null = null
  await driver.wait(
    async () => {
      const handles = await driver.getAllWindowHandles()
      for (const handle of handles) {
        await driver.switchTo().window(handle)
        const url = await driver.getCurrentUrl()
        if (url.startsWith(baseUrl)) {
          appHandle = handle
          return true
        }
      }
      return false
    },
    180000,
    'Timed out waiting for return to the admin portal after verification',
  )

  if (appHandle) {
    await driver.switchTo().window(appHandle)
  }

  await waitForPageLoad(driver)
  await driver.wait(
    until.elementLocated(By.xpath("//h1[contains(text(),'Dashboard')]")),
    60000,
  )
    logInfo('Login complete, dashboard visible')
  }

  before(async () => {
    driver = await createDriver()
    loginPage = new LoginPage(driver)
    schedulesPage = new SchedulesPage(driver)
    tasksPage = new TasksPage(driver)

    await performInteractiveLogin()
  })

  after(async () => {
    if (driver) {
      await driver.quit()
    }
  })

  describe('Weekly Planner (Admin)', () => {
    it('loads the planner grid and creates a new schedule entry', async () => {
      await schedulesPage.openPlanner()

      const title = `Coverage ${Date.now()}`

      // Use unique timestamps a few hours from now to avoid conflicts
      const startTime = new Date(Date.now() + 2 * 60 * 60 * 1000)
      startTime.setSeconds(0, 0)
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000)
      
      // Ensure filters cover the schedule window before we capture baseline count
      const rangeStart = new Date(startTime.getTime() - 60 * 60 * 1000)
      const rangeEnd = new Date(endTime.getTime() + 60 * 60 * 1000)
      await schedulesPage.ensureFilters(scheduleUserId, rangeStart, rangeEnd)

      const initialCount = await schedulesPage.getRecordCount()
      
      logInfo(`Creating schedule with start: ${startTime.toISOString()} (local: ${startTime.toString()})`)
      logInfo(`Creating schedule with end: ${endTime.toISOString()} (local: ${endTime.toString()})`)
      
      await schedulesPage.createSchedule({
        userId: scheduleUserId,
        teamId: scheduleTeamId,
        title,
        description: 'Automated verification shift',
        start: startTime,
        end: endTime,
      })

      await schedulesPage.waitForSchedule(title)
      const updatedCount = await schedulesPage.getRecordCount()
      expect(updatedCount).to.be.greaterThan(initialCount)
    })

    it('applies the user filter without errors', async () => {
      await schedulesPage.openPlanner()
      await schedulesPage.filterByUser(String(scheduleUserId))

      const visibleIds = await schedulesPage.getVisibleUserIds()
      if (visibleIds.length > 0) {
        expect(visibleIds.every((id) => id === scheduleUserId)).to.eq(true)
      }

      await schedulesPage.clearUserFilter()
    })
  })

  describe('My Schedule view', () => {
    it('shows the logged-in user schedule list or empty state', async () => {
      await schedulesPage.openMySchedule()
      const titles = await schedulesPage.getMyScheduleTitles()
      expect(titles).to.be.an('array')
    })
  })

  describe('Tasks Dashboard', () => {
    it('allows creating a task, updating status, and adding a comment', async () => {
      await tasksPage.open()

      expect(await tasksPage.isAssignFormVisible()).to.eq(true)

      const title = `Task ${Date.now()}`
      // Use due date 1 day from now to avoid reuse
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      dueDate.setHours(17, 0, 0, 0)
      
      // Ensure filters are scoped to the assignee before creation
      await tasksPage.ensureFilters('', taskAssigneeId)
      
      logInfo(`Creating task with due date: ${dueDate.toISOString()} (local: ${dueDate.toString()})`)
      
      await tasksPage.createTask({
        title,
        description: 'Ensure Teams reminders trigger',
        assigneeId: taskAssigneeId,
        priority: 'High',
        dueDate,
        tags: 'phase4,selenium',
      })

      await tasksPage.waitForTask(title)
      await tasksPage.changeStatus(title, 'Done')
      await tasksPage.addComment(title, 'Automated status update')
    })
  })
})

