import 'package:flutter/material.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'auth_service.dart';

class RegisterSheet extends StatefulWidget {
  const RegisterSheet({super.key});
  @override
  State<RegisterSheet> createState() => _RegisterSheetState();
}

class _RegisterSheetState extends State<RegisterSheet> {
  final email = TextEditingController();
  final pw = TextEditingController();
  final code = TextEditingController();
  String phase = 'signup'; // signup -> confirm
  String? err;
  bool busy = false;

  @override
  void dispose() {
    email.dispose();
    pw.dispose();
    code.dispose();
    super.dispose();
  }

  Future<void> _signup() async {
    setState(() { busy = true; err = null; });
    try {
      await AuthService.instance.signUpEmail(email.text.trim(), pw.text);
      if (mounted) setState(() { phase = 'confirm'; });
    } on AuthException catch (e) {
      String errorMessage = 'Registration failed';
      if (e.message.contains('UsernameExistsException')) {
        errorMessage = 'An account with this email already exists';
      } else if (e.message.contains('InvalidPasswordException')) {
        errorMessage = 'Password does not meet requirements';
      } else if (e.message.contains('InvalidParameterException')) {
        errorMessage = 'Invalid email format';
      } else {
        errorMessage = e.message;
      }
      setState(() => err = errorMessage);
    } catch (e) {
      setState(() => err = 'Registration failed: ${e.toString()}');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _confirm() async {
    setState(() { busy = true; err = null; });
    try {
      await AuthService.instance.confirmSignUp(email.text.trim(), code.text.trim());
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Registration confirmed! Please sign in.')),
        );
      }
    } on AuthException catch (e) {
      String errorMessage = 'Confirmation failed';
      if (e.message.contains('CodeMismatchException')) {
        errorMessage = 'Invalid confirmation code';
      } else if (e.message.contains('ExpiredCodeException')) {
        errorMessage = 'Confirmation code has expired';
      } else {
        errorMessage = e.message;
      }
      setState(() => err = errorMessage);
    } catch (e) {
      setState(() => err = 'Confirmation failed: ${e.toString()}');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(phase == 'signup' ? 'Register' : 'Confirm Registration', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          if (phase == 'signup') ...[
            TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
            TextField(controller: pw, decoration: const InputDecoration(labelText: 'Password'), obscureText: true),
            const SizedBox(height: 8),
            if (err != null) Text(err!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 8),
            FilledButton(onPressed: busy ? null : _signup, child: busy ? const CircularProgressIndicator() : const Text('Sign Up')),
          ] else ...[
            Text('Enter the code sent to ${email.text.trim()}'),
            TextField(controller: code, decoration: const InputDecoration(labelText: 'Confirmation Code')),
            const SizedBox(height: 8),
            if (err != null) Text(err!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 8),
            FilledButton(onPressed: busy ? null : _confirm, child: busy ? const CircularProgressIndicator() : const Text('Confirm')),
          ],
        ],
      ),
    );
  }
}

