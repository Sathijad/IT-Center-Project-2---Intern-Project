import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_driver/driver_extension.dart';
import 'src/auth_service.dart';
import 'src/api_client.dart';
import 'src/home_screen.dart';
import 'src/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Only enable Flutter Driver extension when running Appium tests
  // Set ENABLE_FLUTTER_DRIVER=true when building for tests:
  // flutter build apk --debug --dart-define=ENABLE_FLUTTER_DRIVER=true
  const bool enableDriver = bool.fromEnvironment('ENABLE_FLUTTER_DRIVER', defaultValue: false);
  if (enableDriver) {
    enableFlutterDriverExtension();
    debugPrint('Flutter Driver extension enabled for testing');
  }
  
  // Only initialize Firebase on mobile platforms (Android/iOS), not on web
  if (!kIsWeb) {
    // Use conditional import - dart:io is not available on web
    try {
      await Firebase.initializeApp();
    } catch (e) {
      debugPrint('Firebase initialization skipped: $e');
    }
  }
  await AuthService.instance.init(); // Amplify init
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'IT Center – Employee',
      theme: ThemeData(useMaterial3: true),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});
  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  AuthUser? user;
  bool busy = true;
  bool _hasMarkedLogin = false;

  @override
  void initState() {
    super.initState();
    _load();
    Amplify.Hub.listen(HubChannel.Auth, (event) {
      // Reset login marker when user signs out
      if (event.type == AuthHubEventType.signedOut) {
        _hasMarkedLogin = false;
      }
      if (mounted) _load();
    });
  }

  Future<void> _load() async {
    try {
      final previousUser = user;
      user = await Amplify.Auth.getCurrentUser();
      
      // If user just signed in (was null, now has user), mark login and send FCM token
      if (previousUser == null && user != null && !_hasMarkedLogin) {
        await _markLoginOnce();
        await _sendFCMToken();
        _hasMarkedLogin = true;
      }
    } catch (_) {
      user = null;
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _markLoginOnce() async {
    try {
      await ApiClient().markLoginOnce();
    } catch (e) {
      // Log but don't fail the auth flow
      debugPrint('Failed to mark login: $e');
    }
  }

  Future<void> _sendFCMToken() async {
    // Only send FCM token on mobile platforms, not on web
    if (kIsWeb) {
      debugPrint('FCM token not supported on web platform');
      return;
    }
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        debugPrint('FCM Token obtained: $token');
        await ApiClient().sendFCMToken(token);
      }
    } catch (e) {
      // Log but don't fail the auth flow
      debugPrint('Failed to send FCM token: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (busy) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return user == null ? const LoginScreen() : const HomeScreen();
  }
}

