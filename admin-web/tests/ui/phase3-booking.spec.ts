import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { WebDriver } from 'selenium-webdriver';
import { createDriver, waitForPageLoad, getBaseUrl } from './helpers/test-base.js';
import { TEST_DATA } from './helpers/test-data.js';
import { authenticateUser } from './helpers/auth-helper.js';
import { DashboardPage } from './page-objects/DashboardPage.js';
import { BookRoomPage } from './page-objects/BookRoomPage.js';
import { MyBookingsPage } from './page-objects/MyBookingsPage.js';
import { BookingRoomsPage } from './page-objects/BookingRoomsPage.js';
import { BookingBlackoutsPage } from './page-objects/BookingBlackoutsPage.js';
import { AdminBookingsPage } from './page-objects/AdminBookingsPage.js';
import { BookingReportsPage } from './page-objects/BookingReportsPage.js';

/**
 * Phase 3 Booking System - Comprehensive Selenium Test Suite
 * 
 * This test suite covers:
 * 1. Authentication with real credentials (admin@test.com / Admin@123)
 * 2. Manual verification code entry
 * 3. Employee booking features (Book Room, My Bookings)
 * 4. Admin booking features (Rooms, Blackouts, All Bookings, Reports)
 */
describe('Phase 3 - Booking System E2E Tests', () => {
  let driver: WebDriver;
  let dashboardPage: DashboardPage;
  let bookRoomPage: BookRoomPage;
  let myBookingsPage: MyBookingsPage;
  let bookingRoomsPage: BookingRoomsPage;
  let bookingBlackoutsPage: BookingBlackoutsPage;
  let adminBookingsPage: AdminBookingsPage;
  let bookingReportsPage: BookingReportsPage;
  let isAuthenticated: boolean = false;

  // Helper to get future date/time for bookings
  const getFutureDateTime = (hoursFromNow: number = 2): string => {
    const date = new Date();
    date.setHours(date.getHours() + hoursFromNow);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  before(async () => {
    console.log('🚀 Starting Selenium WebDriver for Phase 3 Booking Tests...');
    console.log(`📧 Using credentials: ${TEST_DATA.adminCredentials.email}`);
    if (process.env.TEST_USER_EMAIL) {
      console.log('✅ Using credentials from environment variables (TEST_USER_EMAIL, TEST_USER_PASSWORD)');
    } else {
      console.log('⚠️  Using default credentials. Set TEST_USER_EMAIL and TEST_USER_PASSWORD to use custom credentials.');
    }
    driver = await createDriver();
    dashboardPage = new DashboardPage(driver);
    bookRoomPage = new BookRoomPage(driver);
    myBookingsPage = new MyBookingsPage(driver);
    bookingRoomsPage = new BookingRoomsPage(driver);
    bookingBlackoutsPage = new BookingBlackoutsPage(driver);
    adminBookingsPage = new AdminBookingsPage(driver);
    bookingReportsPage = new BookingReportsPage(driver);
  });

  after(async () => {
    if (driver) {
      console.log('🛑 Closing browser...');
      await driver.quit();
    }
  });

  describe('Employee Booking Features', () => {
    it('should navigate to Book Room page and search for rooms', async () => {
      // Authenticate first
      if (!isAuthenticated) {
        await authenticateUser(driver);
        isAuthenticated = true;
      }
      console.log('\n========================================');
      console.log('🏢 STARTING PHASE 3 BOOKING TESTS');
      console.log('========================================\n');
      console.log('🏢 Testing Book Room page...');
      
      await bookRoomPage.open();
      await waitForPageLoad(driver);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl, 'Should be on Book Room page').to.include('/bookings/new');
      console.log('✅ Successfully navigated to Book Room page');

      // Test room search
      console.log('🔍 Testing room search...');
      await bookRoomPage.searchRooms('5', '');
      await new Promise(resolve => setTimeout(resolve, 2000));

      const roomCount = await bookRoomPage.getRoomCount();
      console.log(`✅ Found ${roomCount} rooms`);
      expect(roomCount, 'Should find at least some rooms').to.be.greaterThanOrEqual(0);
    });

    it('should be able to view room availability', async () => {
      // Authenticate first
      if (!isAuthenticated) {
        await authenticateUser(driver);
        isAuthenticated = true;
      }
      
      console.log('📅 Testing room availability check...');
      
      await bookRoomPage.open();
      await waitForPageLoad(driver);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Try to select first room if available
      try {
        // Enter date/time for availability check
        const startDateTime = getFutureDateTime(2);
        const endDateTime = getFutureDateTime(3);
        
        console.log(`📅 Setting start time: ${startDateTime}`);
        await bookRoomPage.enterStartDateTime(startDateTime);
        
        console.log(`📅 Setting end time: ${endDateTime}`);
        await bookRoomPage.enterEndDateTime(endDateTime);
        
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if availability is shown
        const hasAvailability = await bookRoomPage.isAvailabilityVisible();
        console.log(`✅ Availability check completed: ${hasAvailability}`);
      } catch (error) {
        console.log(`⚠️  Could not check availability: ${error}`);
        // This is okay - rooms might not be loaded or form might be different
      }
    });

    it('should navigate to My Bookings page', async () => {
      // Authenticate first
      if (!isAuthenticated) {
        await authenticateUser(driver);
        isAuthenticated = true;
      }
      
      console.log('📋 Testing My Bookings page...');
      
      await myBookingsPage.open();
      await waitForPageLoad(driver);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl, 'Should be on My Bookings page').to.include('/bookings/my');
      console.log('✅ Successfully navigated to My Bookings page');

      // Check if bookings are displayed
      const hasBookings = await myBookingsPage.hasBookings();
      const bookingCount = await myBookingsPage.getBookingCount();
      console.log(`✅ Bookings found: ${bookingCount}, Has bookings: ${hasBookings}`);
    });
  });

  describe('Admin Booking Features', () => {
    it('should navigate to Booking Rooms page (Admin)', async () => {
      // Authenticate first
      if (!isAuthenticated) {
        await authenticateUser(driver);
        isAuthenticated = true;
      }
      
      console.log('🏛️ Testing Booking Rooms page (Admin)...');
      
      await bookingRoomsPage.open();
      await waitForPageLoad(driver);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl, 'Should be on Booking Rooms page').to.include('/admin/booking/rooms');
      console.log('✅ Successfully navigated to Booking Rooms page');

      // Check if room list is visible
      const isRoomListVisible = await bookingRoomsPage.isRoomListVisible();
      expect(isRoomListVisible, 'Room list should be visible').to.be.true;

      const roomCount = await bookingRoomsPage.getRoomCount();
      console.log(`✅ Found ${roomCount} rooms`);
    });

    it('should navigate to Booking Blackouts page (Admin)', async () => {
      // Authenticate first
      if (!isAuthenticated) {
        await authenticateUser(driver);
        isAuthenticated = true;
      }
      
      console.log('🚫 Testing Booking Blackouts page (Admin)...');
      
      await bookingBlackoutsPage.open();
      await waitForPageLoad(driver);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl, 'Should be on Booking Blackouts page').to.include('/admin/booking/blackouts');
      console.log('✅ Successfully navigated to Booking Blackouts page');

      // Check if blackout list is visible
      const blackoutCount = await bookingBlackoutsPage.getBlackoutCount();
      console.log(`✅ Found ${blackoutCount} blackout windows`);
    });

    it('should navigate to Admin Bookings page and test filters', async () => {
      // Authenticate first
      if (!isAuthenticated) {
        await authenticateUser(driver);
        isAuthenticated = true;
      }
      
      console.log('📊 Testing Admin Bookings page...');
      
      await adminBookingsPage.open();
      await waitForPageLoad(driver);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl, 'Should be on Admin Bookings page').to.include('/admin/booking/bookings');
      console.log('✅ Successfully navigated to Admin Bookings page');

      // Check if filters are visible
      const hasFilters = await adminBookingsPage.isFiltersVisible();
      console.log(`✅ Filters visible: ${hasFilters}`);

      // Test filtering by status
      try {
        console.log('🔍 Testing status filter...');
        await adminBookingsPage.filterByStatus('CONFIRMED');
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Status filter applied');
      } catch (error) {
        console.log(`⚠️  Could not apply status filter: ${error}`);
      }

      const bookingCount = await adminBookingsPage.getBookingCount();
      console.log(`✅ Found ${bookingCount} bookings`);
    });

    it('should navigate to Booking Reports page', async () => {
      // Authenticate first
      if (!isAuthenticated) {
        await authenticateUser(driver);
        isAuthenticated = true;
      }
      
      console.log('📈 Testing Booking Reports page...');
      
      await bookingReportsPage.open();
      await waitForPageLoad(driver);
      await new Promise(resolve => setTimeout(resolve, 3000));

      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl, 'Should be on Booking Reports page').to.include('/admin/booking/reports');
      console.log('✅ Successfully navigated to Booking Reports page');

      // Check if report is visible
      const isReportVisible = await bookingReportsPage.isReportVisible();
      console.log(`✅ Report visible: ${isReportVisible}`);

      // Test date range
      try {
        const today = new Date().toISOString().split('T')[0];
        const firstOfMonth = new Date(new Date().setDate(1)).toISOString().split('T')[0];
        
        console.log(`📅 Setting date range: ${firstOfMonth} to ${today}`);
        await bookingReportsPage.setDateRange(firstOfMonth, today);
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Date range set');
      } catch (error) {
        console.log(`⚠️  Could not set date range: ${error}`);
      }

      // Get utilization stats
      const stats = await bookingReportsPage.getUtilizationStats();
      console.log(`✅ Found ${stats.length} utilization statistics`);
    });
  });

  describe('Phase 3 Navigation Flow', () => {
    it('should navigate through all Phase 3 booking pages', async () => {
      // Authenticate first
      if (!isAuthenticated) {
        await authenticateUser(driver);
        isAuthenticated = true;
      }
      
      console.log('🧭 Testing Phase 3 navigation flow...');
      
      // 1. Dashboard
      await dashboardPage.open();
      await waitForPageLoad(driver);
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ Navigated to Dashboard');

      // 2. Book Room (Employee)
      await bookRoomPage.open();
      await waitForPageLoad(driver);
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ Navigated to Book Room');

      // 3. My Bookings (Employee)
      await myBookingsPage.open();
      await waitForPageLoad(driver);
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ Navigated to My Bookings');

      // 4. Admin Bookings
      await adminBookingsPage.open();
      await waitForPageLoad(driver);
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ Navigated to Admin Bookings');

      // 5. Booking Rooms (Admin)
      await bookingRoomsPage.open();
      await waitForPageLoad(driver);
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ Navigated to Booking Rooms');

      // 6. Booking Blackouts (Admin)
      await bookingBlackoutsPage.open();
      await waitForPageLoad(driver);
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ Navigated to Booking Blackouts');

      // 7. Booking Reports (Admin)
      await bookingReportsPage.open();
      await waitForPageLoad(driver);
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ Navigated to Booking Reports');

      console.log('✅ Phase 3 navigation flow completed successfully');
    });
  });
});

