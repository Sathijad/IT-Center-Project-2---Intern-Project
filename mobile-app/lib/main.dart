import 'package:flutter/material.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'src/auth_service.dart';
import 'src/api_client.dart';
import 'src/home_screen.dart';
import 'src/login_screen.dart';
import 'package:flutter_driver/driver_extension.dart';
import 'package:itcenter_auth/main.dart' as app;

Future<void> main() async {
  // enableFlutterDriverExtension();
  WidgetsFlutterBinding.ensureInitialized();
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
  VoidCallback? _testAuthListener;

  @override
  void initState() {
    super.initState();
    if (AuthService.isE2ETest) {
      _testAuthListener = () {
        if (mounted) setState(() {});
      };
      AuthService.instance.testSignedInNotifier.addListener(_testAuthListener!);
      _load();
    } else {
      _load();
      Amplify.Hub.listen(HubChannel.Auth, (event) {
        // Reset login marker when user signs out
        if (event.type == AuthHubEventType.signedOut) {
          _hasMarkedLogin = false;
        }
        if (mounted) _load();
      });
    }
  }

  Future<void> _load() async {
    if (AuthService.isE2ETest) {
      if (mounted) setState(() => busy = false);
      return;
    }

    try {
      final previousUser = user;
      user = await Amplify.Auth.getCurrentUser();
      
      // If user just signed in (was null, now has user), mark login
      if (previousUser == null && user != null && !_hasMarkedLogin) {
        await _markLoginOnce();
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

  @override
  Widget build(BuildContext context) {
    if (AuthService.isE2ETest) {
      if (busy) {
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      }
      return AuthService.instance.isTestSignedIn
          ? const HomeScreen()
          : const LoginScreen();
    }

    if (busy) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return user == null ? const LoginScreen() : const HomeScreen();
  }

  @override
  void dispose() {
    if (_testAuthListener != null) {
      AuthService.instance.testSignedInNotifier.removeListener(_testAuthListener!);
    }
    super.dispose();
  }
}

