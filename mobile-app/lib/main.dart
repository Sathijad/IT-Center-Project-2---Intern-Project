import 'package:flutter/material.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'src/auth_service.dart';
import 'src/api_client.dart';
import 'src/home_screen.dart';
import 'src/login_screen.dart';

Future<void> main() async {
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
    if (busy) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return user == null ? const LoginScreen() : const HomeScreen();
  }
}

