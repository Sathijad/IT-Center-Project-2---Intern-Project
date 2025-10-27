import 'package:flutter/material.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'src/auth_service.dart';
import 'src/home_screen.dart';
import 'src/login_screen.dart';

void main() async {
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

  @override
  void initState() {
    super.initState();
    _load();
    Amplify.Hub.listen(HubChannel.Auth, (event) {
      if (mounted) _load();
    });
  }

  Future<void> _load() async {
    try {
      user = await Amplify.Auth.getCurrentUser();
    } catch (_) {
      user = null;
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (busy) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return user == null ? const LoginScreen() : const HomeScreen();
  }
}

