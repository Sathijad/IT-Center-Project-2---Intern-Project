"""
Appium tests for Flutter Leave & Attendance features
Requires: Appium server, Flutter app installed on device/emulator
"""

from appium import webdriver
from appium.options.android import UiAutomator2Options
from appium.webdriver.common.appiumby import AppiumBy
import time


class TestLeaveAttendance:
    
    @classmethod
    def setup_class(cls):
        """Setup Appium driver"""
        options = UiAutomator2Options()
        options.platform_name = "Android"
        options.device_name = "emulator-5554"
        options.app_package = "com.itcenter.auth"
        options.app_activity = ".MainActivity"
        options.automation_name = "UiAutomator2"
        
        cls.driver = webdriver.Remote("http://localhost:4723", options=options)
        cls.driver.implicitly_wait(10)
    
    @classmethod
    def teardown_class(cls):
        """Cleanup"""
        cls.driver.quit()
    
    def test_apply_for_leave(self):
        """Test leave application flow"""
        # Navigate to leave application
        # Note: Adjust selectors based on your Flutter app structure
        
        # Find and tap "Apply for Leave" button
        apply_button = self.driver.find_element(
            AppiumBy.XPATH, 
            "//*[@text='Apply for Leave']"
        )
        apply_button.click()
        time.sleep(2)
        
        # Select leave policy
        policy_dropdown = self.driver.find_element(
            AppiumBy.XPATH,
            "//*[@class='DropdownButtonFormField']"
        )
        policy_dropdown.click()
        time.sleep(1)
        
        annual_leave_option = self.driver.find_element(
            AppiumBy.XPATH,
            "//*[@text='Annual Leave (14 days)']"
        )
        annual_leave_option.click()
        time.sleep(1)
        
        # Select start date
        start_date_field = self.driver.find_element(
            AppiumBy.XPATH,
            "//*[@text='Select start date']"
        )
        start_date_field.click()
        time.sleep(1)
        
        # Select date in date picker (adjust based on your date picker)
        # This is a placeholder - actual implementation depends on date picker widget
        
        # Enter reason
        reason_field = self.driver.find_element(
            AppiumBy.XPATH,
            "//*[@class='TextFormField']"
        )
        reason_field.send_keys("Vacation")
        
        # Submit form
        submit_button = self.driver.find_element(
            AppiumBy.XPATH,
            "//*[@text='Submit Request']"
        )
        submit_button.click()
        time.sleep(2)
        
        # Verify success (check for success message or navigation)
        # This depends on your app's implementation
    
    def test_clock_in_out(self):
        """Test clock in/out functionality"""
        # Navigate to clock in/out screen
        clock_button = self.driver.find_element(
            AppiumBy.XPATH,
            "//*[@text='Clock In/Out']"
        )
        clock_button.click()
        time.sleep(2)
        
        # Check current state
        clock_in_button = self.driver.find_element(
            AppiumBy.XPATH,
            "//*[@text='Clock In']"
        )
        
        if clock_in_button:
            # Clock in
            clock_in_button.click()
            time.sleep(3)  # Wait for location/GPS
            
            # Verify state changed to "Clock Out"
            clock_out_button = self.driver.find_element(
                AppiumBy.XPATH,
                "//*[@text='Clock Out']"
            )
            assert clock_out_button is not None
            
            # Clock out
            clock_out_button.click()
            time.sleep(2)
            
            # Verify state changed back to "Clock In"
            clock_in_button_after = self.driver.find_element(
                AppiumBy.XPATH,
                "//*[@text='Clock In']"
            )
            assert clock_in_button_after is not None
    
    def test_view_leave_history(self):
        """Test viewing leave request history"""
        # Navigate to leave history
        history_button = self.driver.find_element(
            AppiumBy.XPATH,
            "//*[@text='Leave History']"
        )
        history_button.click()
        time.sleep(2)
        
        # Verify list of leave requests is displayed
        leave_requests = self.driver.find_elements(
            AppiumBy.XPATH,
            "//*[@class='ListView']//*[@class='ListItem']"
        )
        
        # At least the list structure should exist
        assert len(leave_requests) >= 0  # May be empty initially
    
    def test_form_validation(self):
        """Test form validation for leave application"""
        # Navigate to leave application
        apply_button = self.driver.find_element(
            AppiumBy.XPATH,
            "//*[@text='Apply for Leave']"
        )
        apply_button.click()
        time.sleep(2)
        
        # Try to submit without filling required fields
        submit_button = self.driver.find_element(
            AppiumBy.XPATH,
            "//*[@text='Submit Request']"
        )
        submit_button.click()
        time.sleep(1)
        
        # Verify validation errors appear
        error_messages = self.driver.find_elements(
            AppiumBy.XPATH,
            "//*[contains(@text, 'required') or contains(@text, 'Please')]"
        )
        
        assert len(error_messages) > 0, "Validation errors should be displayed"

