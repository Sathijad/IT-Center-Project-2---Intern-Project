# Phase 7 Appium Test Files

This directory contains Appium E2E tests for Phase 7: Feedback & Issue Reporting functionality.

## Test Files

### 1. `phase7_feedback_list.spec.js`
Tests the feedback list screen functionality:
- Navigation to feedback list from home screen
- Status filtering
- Pull-to-refresh functionality

### 2. `phase7_submit_feedback.spec.js`
Tests the submit feedback flow:
- Complete feedback submission with all fields
- Form validation for required fields

### 3. `phase7_feedback_detail.spec.js`
Tests the feedback detail screen:
- Viewing feedback details
- Adding messages/comments to feedback
- Viewing attachments (if available)

### 4. `phase7_complete_feedback_flow.spec.js`
Comprehensive end-to-end test covering the complete feedback lifecycle:
- Login → Submit Feedback → View List → Filter → View Detail → Add Message

## Prerequisites

1. **Appium Server** running on `http://127.0.0.1:4723`
2. **Android Emulator** running (device name: `emulator-5554`)
3. **Flutter APK** built and available at:
   ```
   C:/Users/SathijaDeshapriya/Downloads/IT Center Project 2/mobile-app/build/app/outputs/flutter-apk/app-debug.apk
   ```
4. **Backend Services** running:
   - Auth backend (port 8080)
   - Feedback backend (port 8086)

## Running Tests

### Run all Phase 7 tests:
```bash
npm run wdio -- --spec test/specs/phase7_*.spec.js
```

### Run individual test file:
```bash
npm run wdio -- --spec test/specs/phase7_feedback_list.spec.js
```

### Run complete flow test:
```bash
npm run wdio -- --spec test/specs/phase7_complete_feedback_flow.spec.js
```

## Test Configuration

All tests use the following configuration:
- **Platform**: Android
- **Automation**: Flutter (appium-flutter-driver)
- **Device**: emulator-5554
- **Timeout**: 180-300 seconds (depending on test)

## Known Limitations

### Missing ValueKeys
Some Flutter widgets don't have explicit `ValueKey` identifiers, which makes them harder to locate in tests. The tests use workarounds:

1. **Text-based finders**: Using `byText()` for form fields and buttons
2. **Coordinate-based taps**: For cards and list items without keys
3. **Semantic labels**: As fallback when available

### Recommended Improvements

To make tests more robust, consider adding `ValueKey` to Flutter widgets:

#### Submit Feedback Screen
```dart
TextFormField(
  key: const ValueKey('submit_feedback_title_field'),
  controller: _titleController,
  // ...
)

TextFormField(
  key: const ValueKey('submit_feedback_description_field'),
  controller: _descriptionController,
  // ...
)

ElevatedButton(
  key: const ValueKey('submit_feedback_button'),
  onPressed: _submitFeedback,
  // ...
)
```

#### Feedback List Screen
```dart
DropdownButton<String>(
  key: const ValueKey('feedback_status_filter'),
  // ...
)

IconButton(
  key: const ValueKey('feedback_add_button'),
  icon: const Icon(Icons.add),
  // ...
)
```

#### Feedback Detail Screen
```dart
TextField(
  key: const ValueKey('feedback_message_field'),
  controller: _messageController,
  // ...
)

ElevatedButton(
  key: const ValueKey('send_message_button'),
  onPressed: _addMessage,
  // ...
)
```

#### Feedback Card Widget
```dart
InkWell(
  key: ValueKey('feedback_card_${feedback.feedbackId}'),
  onTap: onTap,
  // ...
)
```

## Test Data

Tests use the following test credentials (update as needed):
- **Email**: `test@example.com`
- **Password**: `TestPassword123!`

## Troubleshooting

### Tests fail to find elements
- Verify the APK is built with `flutter build apk --debug`
- Check that `enableFlutterDriverExtension()` is called in `main.dart`
- Ensure Appium Flutter driver is installed: `appium driver install flutter`

### MFA blocking tests
- Tests include manual wait for MFA entry (15 seconds)
- For automated testing, consider disabling MFA for test users

### Form fields not found
- Some fields use text-based finders which may be less reliable
- Consider adding ValueKeys to form fields for better test reliability

## Notes

- Tests include extensive logging for debugging
- Manual verification may be needed for some interactions
- Tests are designed to be resilient to minor UI changes
- All tests include proper cleanup in `after` hooks

