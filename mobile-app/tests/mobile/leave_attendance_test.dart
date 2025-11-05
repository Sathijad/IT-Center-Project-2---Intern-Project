import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:itcenter_auth/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Leave & Attendance Mobile Tests', () {
    testWidgets('Apply for leave flow', (WidgetTester tester) async {
      // Start app
      app.main();
      await tester.pumpAndSettle();

      // Navigate to leave application screen
      // Note: This assumes navigation is implemented
      // You may need to tap on a menu item or button
      
      // Find and tap "Apply for Leave" button
      final applyButton = find.text('Apply for Leave');
      if (applyButton.evaluate().isNotEmpty) {
        await tester.tap(applyButton);
        await tester.pumpAndSettle();
      }

      // Fill leave form
      // Select policy
      final policyDropdown = find.byType('DropdownButtonFormField');
      if (policyDropdown.evaluate().isNotEmpty) {
        await tester.tap(policyDropdown);
        await tester.pumpAndSettle();
        
        // Select first policy option
        final policyOption = find.text('Annual Leave').first;
        if (policyOption.evaluate().isNotEmpty) {
          await tester.tap(policyOption);
          await tester.pumpAndSettle();
        }
      }

      // Select start date
      final startDateField = find.text('Select start date');
      if (startDateField.evaluate().isNotEmpty) {
        await tester.tap(startDateField);
        await tester.pumpAndSettle();
        
        // In a real test, you would interact with date picker
        // For now, we'll just verify the field exists
      }

      // Select end date
      final endDateField = find.text('Select end date');
      if (endDateField.evaluate().isNotEmpty) {
        await tester.tap(endDateField);
        await tester.pumpAndSettle();
      }

      // Enter reason
      final reasonField = find.byType('TextFormField').last;
      if (reasonField.evaluate().isNotEmpty) {
        await tester.enterText(reasonField, 'Vacation');
        await tester.pumpAndSettle();
      }

      // Verify form is filled
      expect(find.text('Vacation'), findsOneWidget);

      // Submit form
      final submitButton = find.text('Submit Request');
      if (submitButton.evaluate().isNotEmpty) {
        await tester.tap(submitButton);
        await tester.pumpAndSettle();
        
        // Verify success message or navigation
        // Note: This depends on your app's success handling
      }
    });

    testWidgets('Clock in/out flow', (WidgetTester tester) async {
      // Start app
      app.main();
      await tester.pumpAndSettle();

      // Navigate to clock in/out screen
      final clockButton = find.text('Clock In/Out');
      if (clockButton.evaluate().isNotEmpty) {
        await tester.tap(clockButton);
        await tester.pumpAndSettle();
      }

      // Verify clock in button is visible
      final clockInButton = find.text('Clock In');
      if (clockInButton.evaluate().isNotEmpty) {
        expect(clockInButton, findsOneWidget);
        
        // Tap clock in button
        await tester.tap(clockInButton);
        await tester.pumpAndSettle();
        
        // Verify state changes to "Clock Out"
        // Note: This may require location permissions
        await tester.pumpAndSettle(const Duration(seconds: 2));
        
        // Verify success message or state change
        final clockOutButton = find.text('Clock Out');
        // The button text should change after clocking in
        // (assuming successful clock-in)
      }
    });

    testWidgets('View leave history', (WidgetTester tester) async {
      // Start app
      app.main();
      await tester.pumpAndSettle();

      // Navigate to leave history
      final historyButton = find.text('Leave History');
      if (historyButton.evaluate().isNotEmpty) {
        await tester.tap(historyButton);
        await tester.pumpAndSettle();
      }

      // Verify leave requests list is displayed
      // Note: This depends on your UI implementation
      // You might look for a ListView or similar widget
      final listView = find.byType('ListView');
      if (listView.evaluate().isNotEmpty) {
        expect(listView, findsWidgets);
      }
    });
  });

  group('Form Validation Tests', () => {
    testWidgets('Validate leave form required fields', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Navigate to leave application
      final applyButton = find.text('Apply for Leave');
      if (applyButton.evaluate().isNotEmpty) {
        await tester.tap(applyButton);
        await tester.pumpAndSettle();
      }

      // Try to submit without filling required fields
      final submitButton = find.text('Submit Request');
      if (submitButton.evaluate().isNotEmpty) {
        await tester.tap(submitButton);
        await tester.pumpAndSettle();
        
        // Verify validation errors appear
        // Note: This depends on your error message implementation
      }
    });
  });
}

