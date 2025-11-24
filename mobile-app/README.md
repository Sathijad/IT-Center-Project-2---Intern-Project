# IT Center Mobile App

Flutter mobile application for the IT Center Staff Management System.

## Features

- **Phase 1:** Authentication (AWS Cognito)
- **Phase 2:** Leave & Attendance Management
- **Phase 3:** Room & Resource Booking

## Getting Started

### Prerequisites

- Flutter 3.35.6 / Dart 3.9.2
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

```bash
flutter pub get
```

### Running the App

```bash
# Android
flutter run

# iOS (macOS only)
flutter run -d ios
```

## Appium + Flutter Driver Smoke Tests

This repo now mirrors the workflow that our teammates used for their Flutter/Appium project:

1. **Enable the Flutter driver extension**
   - `lib/main.dart` calls `enableFlutterDriverExtension()` so the VM service is exposed.
   - `flutter_driver` is listed under `dev_dependencies` in `pubspec.yaml`.

2. **Install global tooling once**
   ```powershell
   node -v
   npm -v
   appium -v
   flutter --version
   java -version
   adb --version

   appium driver install --source=npm appium-flutter-driver
   ```

3. **Install project dependencies**
   ```powershell
   cd mobile-app
   npm install
   ```

4. **Build a debug APK**
   ```powershell
   npm run build:apk:debug
   ```

5. **Start Appium (new terminal)**
   ```powershell
   npx appium --allow-cors --relaxed-security --port 4723
   ```

6. **Run the WebdriverIO smoke test**
   ```powershell
   npm run test:android
   ```

### Test Structure

```
tests/
└── specs/
    └── flutter-smoke.e2e.js   # Sample WDIO spec using appium-flutter-finder
```

### Configuration

- `wdio.conf.js` – single-runner WebdriverIO config (Mocha + Appium service).
- `tests/specs/flutter-smoke.e2e.js` – demonstrates how to use `appium-flutter-finder`.
- `start-appium-manual.ps1` – optional helper if you prefer PowerShell.

### Documentation

- **[Appium Setup Checklist](./docs/appium-setup-checklist.md)** – updated for this stack.
- **[Troubleshooting Guide](./docs/appium-troubleshooting-flutter.md)** – Flutter driver errors & fixes.

### Requirements

- Appium 2.x + `appium-flutter-driver`
- Node.js 18+
- Android SDK / Emulator
- Debug APK build (`flutter build apk --debug`)

## Development

### Building

```bash
# Debug build (for testing)
flutter build apk --debug

# Release build (for production)
flutter build apk --release
```

### Project Structure

```
lib/
├── main.dart              # App entry point
├── src/                   # Core services
│   ├── auth_service.dart
│   ├── api_client.dart
│   └── booking_api.dart
└── screens/               # UI screens
    ├── login_screen.dart
    ├── home_screen.dart
    └── booking/           # Booking module screens
        ├── BookingSearchScreen.dart
        ├── BookingAvailabilityScreen.dart
        ├── BookingCreateScreen.dart
        └── MyBookingsScreen.dart
```

## Resources

- [Flutter Documentation](https://docs.flutter.dev/)
- [Appium Documentation](https://appium.io/docs/en/2.1/)
- [WebdriverIO Documentation](https://webdriver.io/)
