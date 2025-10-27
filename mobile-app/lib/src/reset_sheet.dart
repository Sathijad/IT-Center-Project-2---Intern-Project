import 'package:flutter/material.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'auth_service.dart';

class ResetSheet extends StatefulWidget {
  const ResetSheet({super.key});
  @override
  State<ResetSheet> createState() => _ResetSheetState();
}

class _ResetSheetState extends State<ResetSheet> {
  final email = TextEditingController();
  final code = TextEditingController();
  final newPw = TextEditingController();
  String phase = 'request'; // request -> confirm
  String? err;
  bool busy = false;

  Future<void> _request() async {
    setState(() { busy = true; err = null; });
    try {
      await AuthService.instance.resetPasswordStart(email.text.trim());
      if (mounted) setState(() { phase = 'confirm'; });
    } on AuthException catch (e) {
      setState(() {
        if (e.message.contains('LimitExceeded')) {
          err = 'Too many attempts. Please try again later.';
        } else {
          err = 'Failed to send code: ${e.message}';
        }
      });
    } catch (e) {
      setState(() { err = 'Failed to send code: $e'; });
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _confirm() async {
    setState(() { busy = true; err = null; });
    try {
      await AuthService.instance.resetPasswordConfirm(
        email.text.trim(), 
        code.text.trim(), 
        newPw.text
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Password reset successful! Please sign in.')),
        );
        Navigator.pop(context);
      }
    } on AuthException catch (e) {
      setState(() {
        if (e.message.contains('CodeMismatch')) {
          err = 'Incorrect code. Please try again.';
        } else if (e.message.contains('ExpiredCode')) {
          err = 'Code expired. Please request a new one.';
        } else if (e.message.contains('InvalidPassword')) {
          err = 'Password does not meet requirements. Check policy.';
        } else if (e.message.contains('LimitExceeded')) {
          err = 'Too many attempts. Please try again later.';
        } else {
          err = 'Failed to reset password: ${e.message}';
        }
      });
    } catch (e) {
      setState(() { err = 'Failed to reset password: $e'; });
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
          Text(
            phase == 'request' ? 'Reset Password' : 'Confirm Reset', 
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          if (phase == 'request') ...[
            TextField(
              controller: email, 
              decoration: const InputDecoration(
                labelText: 'Email',
                hintText: 'Enter your email address',
              ),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 16),
            if (err != null) 
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red[300]!),
                ),
                child: Row(
                  children: [
                    Icon(Icons.error_outline, color: Colors.red[700], size: 20),
                    const SizedBox(width: 8),
                    Expanded(child: Text(err!, style: TextStyle(color: Colors.red[900]))),
                  ],
                ),
              ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: busy ? null : _request,
              style: FilledButton.styleFrom(
                minimumSize: const Size(double.infinity, 48),
              ),
              child: busy 
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Send Code'),
            ),
          ] else ...[
            Text('Enter the verification code sent to ${email.text}'),
            const SizedBox(height: 16),
            TextField(
              controller: code, 
              decoration: const InputDecoration(
                labelText: 'Verification Code',
                hintText: 'Enter 6-digit code',
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: newPw, 
              decoration: const InputDecoration(
                labelText: 'New Password',
                hintText: 'Enter new password',
              ), 
              obscureText: true,
            ),
            const SizedBox(height: 16),
            if (err != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red[300]!),
                ),
                child: Row(
                  children: [
                    Icon(Icons.error_outline, color: Colors.red[700], size: 20),
                    const SizedBox(width: 8),
                    Expanded(child: Text(err!, style: TextStyle(color: Colors.red[900]))),
                  ],
                ),
              ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: busy ? null : _confirm,
              style: FilledButton.styleFrom(
                minimumSize: const Size(double.infinity, 48),
              ),
              child: busy 
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Confirm Reset'),
            ),
          ],
        ],
      ),
    );
  }

  @override
  void dispose() {
    email.dispose();
    code.dispose();
    newPw.dispose();
    super.dispose();
  }
}

