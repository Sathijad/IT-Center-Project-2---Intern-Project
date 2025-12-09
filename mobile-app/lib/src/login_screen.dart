import 'package:flutter/material.dart';
import 'package:amplify_auth_cognito/amplify_auth_cognito.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'dart:developer';
import 'auth_service.dart';
import 'register_sheet.dart';
import 'reset_sheet.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _codeController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  final _codeFormKey = GlobalKey<FormState>();
  bool busy = false;
  bool _obscurePassword = true;
  String? err;
  bool _useHostedUI = false; // Toggle between direct and hosted UI
  bool _showCodeEntry = false; // Show MFA/verification code entry
  bool _showTotpSetup = false; // Show TOTP setup with QR code
  bool _showMfaSelection = false; // Show MFA method selection (SMS or TOTP)
  String? _codeDeliveryDestination; // Where the code was sent
  String? _totpSecretKey; // TOTP secret for QR code generation
  String? _totpQrCodeUrl; // QR code URL/URI
  Map<String, dynamic>? _mfaSelectionAdditionalInfo; // Store additional info from MFA selection step

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _doSignIn() async {
    if (_useHostedUI) {
      await _doSignInHostedUI();
    } else {
      await _doSignInEmail();
    }
  }

  Future<void> _doSignInEmail() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() { busy = true; err = null; });
    try {
      final result = await AuthService.instance.signInEmail(
        _emailController.text.trim(),
        _passwordController.text,
      );

      if (result.isComplete) {
        // Sign-in successful - AuthGate will detect the user and navigate
        return;
      }

      // Log the next step for debugging
      log('Sign-in next step: ${result.nextStep}');

      // Check if MFA/verification code is needed
      if (result.nextStep == AuthSignInStep.confirmSignInWithSmsMfaCode ||
          result.nextStep == AuthSignInStep.confirmSignInWithTotpMfaCode ||
          result.nextStep == AuthSignInStep.confirmSignInWithCustomChallenge ||
          result.nextStep == AuthSignInStep.confirmSignInWithNewPassword) {
        // Show code entry screen
        setState(() {
          _showCodeEntry = true;
          _codeDeliveryDestination = result.codeDeliveryDestination;
          busy = false;
        });
      } else if (result.nextStep == AuthSignInStep.continueSignInWithMfaSetupSelection) {
        // MFA method selection required - show UI to select SMS or TOTP
        log('MFA selection required. Additional info: ${result.additionalInfo}');
        setState(() {
          _showMfaSelection = true;
          _showCodeEntry = false;
          _showTotpSetup = false;
          _mfaSelectionAdditionalInfo = result.additionalInfo;
          busy = false;
        });
      } else if (result.nextStep == AuthSignInStep.continueSignInWithTotpSetup) {
        // TOTP setup required - need to setup TOTP and show QR code
        setState(() {
          _showCodeEntry = false;
          _showMfaSelection = false;
          busy = false;
        });
        // Call the TOTP setup method with additional info from sign-in result
        await _handleTotpSetup(result.additionalInfo);
      } else {
        // Unknown step - show detailed error
        setState(() {
          err = 'Additional authentication step required: ${result.nextStep}';
          busy = false;
        });
      }
    } on AuthException catch (e) {
      String errorMessage = 'Sign in failed';
      if (e.message.contains('NotAuthorizedException') || 
          e.message.contains('Invalid credentials')) {
        errorMessage = 'Invalid email or password';
      } else if (e.message.contains('UserNotFoundException')) {
        errorMessage = 'User not found. Please check your email';
      } else if (e.message.contains('TooManyRequestsException')) {
        errorMessage = 'Too many attempts. Please try again later';
      } else if (e.message.contains('UserNotConfirmedException')) {
        errorMessage = 'Please confirm your email address first';
      } else {
        errorMessage = e.message;
      }
      setState(() => err = errorMessage);
      if (mounted) setState(() => busy = false);
    } catch (e) {
      setState(() {
        err = 'Sign in failed: ${e.toString()}';
        busy = false;
      });
    }
  }

  Future<void> _doConfirmCode() async {
    if (!_codeFormKey.currentState!.validate()) {
      return;
    }

    setState(() { busy = true; err = null; });
    try {
      final result = await AuthService.instance.confirmSignInMfa(
        _codeController.text.trim(),
      );

      if (result.isComplete) {
        // Sign-in successful - AuthGate will detect the user and navigate
        return;
      }

      // If there's another step needed
      setState(() {
        err = 'Additional authentication step required';
        busy = false;
      });
    } on AuthException catch (e) {
      String errorMessage = 'Verification failed';
      if (e.message.contains('CodeMismatch') || e.message.contains('Invalid code')) {
        errorMessage = 'Invalid verification code. Please try again';
      } else if (e.message.contains('ExpiredCode')) {
        errorMessage = 'Code has expired. Please sign in again';
      } else {
        errorMessage = e.message;
      }
      setState(() => err = errorMessage);
      if (mounted) setState(() => busy = false);
    } catch (e) {
      setState(() {
        err = 'Verification failed: ${e.toString()}';
        busy = false;
      });
    }
  }

  void _goBackToLogin() {
    setState(() {
      _showCodeEntry = false;
      _showTotpSetup = false;
      _showMfaSelection = false;
      _codeController.clear();
      _totpSecretKey = null;
      _totpQrCodeUrl = null;
      err = null;
    });
  }

  /// Select TOTP as MFA method and continue sign-in
  Future<void> _selectMfaMethod(bool useTotp) async {
    setState(() { busy = true; err = null; });
    try {
      // For continueSignInWithMfaSetupSelection, we need to confirm sign-in with the MFA type
      // TOTP is typically selected by continuing with TOTP setup
      final mfaType = useTotp ? 'TOTP' : 'SMS';
      
      // When MFA selection is required, we confirm sign-in with the selected method
      // Pass the additionalInfo from the sign-in result to see if it contains hints
      final result = await AuthService.instance.selectMfaMethod(useTotp, additionalInfoFromSignIn: null);
      
      if (result.isComplete) {
        // Sign-in complete (shouldn't happen immediately after selection)
        return;
      }
      
      // After selecting TOTP, we should get continueSignInWithTotpSetup
      if (result.nextStep == AuthSignInStep.continueSignInWithTotpSetup) {
        // Now proceed with TOTP setup
        await _handleTotpSetup(result.additionalInfo);
      } else if (result.nextStep == AuthSignInStep.confirmSignInWithSmsMfaCode) {
        // SMS selected - show code entry
        setState(() {
          _showMfaSelection = false;
          _showCodeEntry = true;
          _codeDeliveryDestination = result.codeDeliveryDestination;
          busy = false;
        });
      } else {
        setState(() {
          err = 'Unexpected step after MFA selection: ${result.nextStep}';
          busy = false;
        });
      }
    } catch (e) {
      setState(() {
        err = 'Failed to select MFA method: ${e.toString()}';
        busy = false;
      });
    }
  }

  Future<void> _handleTotpSetup(Map<String, dynamic>? additionalInfo) async {
    setState(() { busy = true; err = null; });
    try {
      final setupResult = await AuthService.instance.setupTotp(additionalInfo: additionalInfo);
      setState(() {
        _totpSecretKey = setupResult.secretCode;
        _totpQrCodeUrl = _generateTotpQrCode(_emailController.text.trim(), setupResult.secretCode);
        _showTotpSetup = true;
        busy = false;
      });
    } catch (e) {
      setState(() {
        err = 'Failed to setup TOTP: ${e.toString()}';
        busy = false;
      });
    }
  }

  String _generateTotpQrCode(String email, String secret) {
    // Format: otpauth://totp/Issuer:Email?secret=SECRET&issuer=Issuer
    final issuer = 'IT Center';
    final uri = Uri(
      scheme: 'otpauth',
      host: 'totp',
      path: '$issuer:$email',
      queryParameters: {
        'secret': secret,
        'issuer': issuer,
      },
    );
    return uri.toString();
  }

  Future<void> _confirmTotpSetup() async {
    if (_codeController.text.trim().isEmpty) {
      setState(() => err = 'Please enter the verification code from your authenticator app');
      return;
    }

    setState(() { busy = true; err = null; });
    try {
      final result = await AuthService.instance.confirmTotpSetup(_codeController.text.trim());
      
      if (result.isComplete) {
        // TOTP setup and sign-in successful
        return;
      }
      
      setState(() {
        err = 'Additional step required: ${result.nextStep}';
        busy = false;
      });
    } catch (e) {
      setState(() {
        err = 'TOTP verification failed: ${e.toString()}';
        busy = false;
      });
    }
  }

  Future<void> _doSignInHostedUI() async {
    setState(() { busy = true; err = null; });
    try {
      await AuthService.instance.signInHostedUI();
      // Sign-in successful - AuthGate will detect the user and navigate
    } on AuthException catch (e) {
      String errorMessage = 'Sign in failed';
      if (e.message.contains('SignInCanceled')) {
        errorMessage = 'Sign in was cancelled';
      } else {
        errorMessage = e.message;
      }
      setState(() => err = errorMessage);
    } catch (e) {
      setState(() => err = 'Sign in failed: ${e.toString()}');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Theme.of(context).colorScheme.primaryContainer,
              Theme.of(context).colorScheme.surface,
            ],
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(
                maxWidth: 420,
                minWidth: 280,
              ),
              child: Card(
                elevation: 4,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Logo/Icon
                      Container(
                        height: 80,
                        width: 80,
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primaryContainer,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.business_center_rounded,
                          size: 40,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'IT Center',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Employee App',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey[600],
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 32),
                      if (_showMfaSelection) ...[
                        // MFA Method Selection UI
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Icon(
                              Icons.security,
                              size: 48,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'Select Authentication Method',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Choose your preferred two-factor authentication method',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.grey[600],
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 24),
                            // TOTP Option
                            Card(
                              elevation: 2,
                              child: InkWell(
                                onTap: busy ? null : () => _selectMfaMethod(true),
                                borderRadius: BorderRadius.circular(12),
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.qr_code_scanner,
                                        color: Theme.of(context).colorScheme.primary,
                                        size: 32,
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text(
                                              'Authenticator App',
                                              style: TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              'Use Google Authenticator or similar',
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Colors.grey[600],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Icon(
                                        Icons.arrow_forward_ios,
                                        color: Colors.grey[400],
                                        size: 20,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            // SMS Option (if available)
                            Card(
                              elevation: 2,
                              child: InkWell(
                                onTap: busy ? null : () => _selectMfaMethod(false),
                                borderRadius: BorderRadius.circular(12),
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.sms,
                                        color: Theme.of(context).colorScheme.secondary,
                                        size: 32,
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text(
                                              'SMS Text Message',
                                              style: TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              'Receive codes via SMS',
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Colors.grey[600],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Icon(
                                        Icons.arrow_forward_ios,
                                        color: Colors.grey[400],
                                        size: 20,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 24),
                            if (err != null)
                              Container(
                                padding: const EdgeInsets.all(12),
                                margin: const EdgeInsets.only(bottom: 16),
                                decoration: BoxDecoration(
                                  color: Colors.red[50],
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.red[200]!),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.error_outline, color: Colors.red[700], size: 20),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        err!,
                                        style: TextStyle(color: Colors.red[900], fontSize: 14),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            TextButton.icon(
                              onPressed: busy ? null : _goBackToLogin,
                              icon: const Icon(Icons.arrow_back),
                              label: const Text('Back to login'),
                            ),
                          ],
                        ),
                      ] else if (_showTotpSetup) ...[
                        // TOTP Setup UI with QR Code
                        Form(
                          key: _codeFormKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Icon(
                                Icons.qr_code_scanner,
                                size: 48,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                'Setup Two-Factor Authentication',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey[600],
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 24),
                              // QR Code Display
                              if (_totpQrCodeUrl != null)
                                Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: Colors.grey[300]!),
                                  ),
                                  child: Column(
                                    children: [
                                      // QR Code Display using qr_flutter
                                      QrImageView(
                                        data: _totpQrCodeUrl!,
                                        version: QrVersions.auto,
                                        size: 200.0,
                                        backgroundColor: Colors.white,
                                        errorCorrectionLevel: QrErrorCorrectLevel.M,
                                      ),
                                      const SizedBox(height: 16),
                                      Text(
                                        'Or enter this code manually:',
                                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                                      ),
                                      const SizedBox(height: 4),
                                      SelectableText(
                                        _totpSecretKey ?? '',
                                        style: TextStyle(
                                          fontFamily: 'monospace',
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: Theme.of(context).colorScheme.primary,
                                        ),
                                        textAlign: TextAlign.center,
                                      ),
                                    ],
                                  ),
                                ),
                              const SizedBox(height: 24),
                              TextFormField(
                                controller: _codeController,
                                keyboardType: TextInputType.number,
                                textInputAction: TextInputAction.done,
                                enabled: !busy,
                                onFieldSubmitted: (_) => _confirmTotpSetup(),
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 8,
                                ),
                                decoration: InputDecoration(
                                  labelText: 'Verification Code',
                                  hintText: '000000',
                                  prefixIcon: const Icon(Icons.lock_outline),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  filled: true,
                                  helperText: 'Enter the 6-digit code from your authenticator app',
                                ),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return 'Please enter the verification code';
                                  }
                                  if (value.trim().length < 6) {
                                    return 'Code must be 6 digits';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 24),
                              if (err != null)
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  margin: const EdgeInsets.only(bottom: 16),
                                  decoration: BoxDecoration(
                                    color: Colors.red[50],
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: Colors.red[200]!),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(Icons.error_outline, color: Colors.red[700], size: 20),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          err!,
                                          style: TextStyle(color: Colors.red[900], fontSize: 14),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              FilledButton.icon(
                                onPressed: busy ? null : _confirmTotpSetup,
                                icon: busy
                                    ? const SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                        ),
                                      )
                                    : const Icon(Icons.check_circle_outline),
                                label: Text(busy ? 'Verifying...' : 'Verify & Complete Setup'),
                                style: FilledButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              TextButton.icon(
                                onPressed: busy ? null : _goBackToLogin,
                                icon: const Icon(Icons.arrow_back),
                                label: const Text('Back to login'),
                              ),
                            ],
                          ),
                        ),
                      ] else if (_showCodeEntry) ...[
                        // Code Entry Form
                        Form(
                          key: _codeFormKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Icon(
                                Icons.verified_user_outlined,
                                size: 48,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                'Verification Code',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                _codeDeliveryDestination != null
                                    ? 'Enter the code sent to:\n${_codeDeliveryDestination}'
                                    : 'Enter the verification code',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey[600],
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 24),
                              TextFormField(
                                controller: _codeController,
                                keyboardType: TextInputType.number,
                                textInputAction: TextInputAction.done,
                                enabled: !busy,
                                onFieldSubmitted: (_) => _doConfirmCode(),
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 8,
                                ),
                                decoration: InputDecoration(
                                  labelText: 'Code',
                                  hintText: '000000',
                                  prefixIcon: const Icon(Icons.lock_outline),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  filled: true,
                                ),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return 'Please enter the verification code';
                                  }
                                  if (value.trim().length < 4) {
                                    return 'Code must be at least 4 digits';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 24),
                              if (err != null)
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  margin: const EdgeInsets.only(bottom: 16),
                                  decoration: BoxDecoration(
                                    color: Colors.red[50],
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: Colors.red[200]!),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(Icons.error_outline, color: Colors.red[700], size: 20),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          err!,
                                          style: TextStyle(color: Colors.red[900], fontSize: 14),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              FilledButton.icon(
                                onPressed: busy ? null : _doConfirmCode,
                                icon: busy
                                    ? const SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                        ),
                                      )
                                    : const Icon(Icons.check_circle_outline),
                                label: Text(busy ? 'Verifying...' : 'Verify Code'),
                                style: FilledButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              TextButton.icon(
                                onPressed: busy ? null : _goBackToLogin,
                                icon: const Icon(Icons.arrow_back),
                                label: const Text('Back to login'),
                              ),
                            ],
                          ),
                        ),
                      ] else ...[
                        // Email/Password Login Form
                        Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              TextFormField(
                                key: const ValueKey('login_email_field'),
                                controller: _emailController,
                                keyboardType: TextInputType.emailAddress,
                                textInputAction: TextInputAction.next,
                                enabled: !busy,
                                decoration: InputDecoration(
                                  labelText: 'Email',
                                  hintText: 'Enter your email',
                                  prefixIcon: const Icon(Icons.email_outlined),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  filled: true,
                                ),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return 'Please enter your email';
                                  }
                                  if (!value.contains('@')) {
                                    return 'Please enter a valid email';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16),
                              TextFormField(
                                key: const ValueKey('login_password_field'),
                                controller: _passwordController,
                                obscureText: _obscurePassword,
                                textInputAction: TextInputAction.done,
                                enabled: !busy,
                                onFieldSubmitted: (_) => _doSignIn(),
                                decoration: InputDecoration(
                                  labelText: 'Password',
                                  hintText: 'Enter your password',
                                  prefixIcon: const Icon(Icons.lock_outlined),
                                  suffixIcon: IconButton(
                                    icon: Icon(
                                      _obscurePassword
                                          ? Icons.visibility_outlined
                                          : Icons.visibility_off_outlined,
                                    ),
                                    onPressed: () {
                                      setState(() => _obscurePassword = !_obscurePassword);
                                    },
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  filled: true,
                                ),
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'Please enter your password';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 24),
                              if (err != null)
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  margin: const EdgeInsets.only(bottom: 16),
                                  decoration: BoxDecoration(
                                    color: Colors.red[50],
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: Colors.red[200]!),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(Icons.error_outline, color: Colors.red[700], size: 20),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          err!,
                                          style: TextStyle(color: Colors.red[900], fontSize: 14),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              FilledButton.icon(
                                key: const ValueKey('login_button'),
                                onPressed: busy ? null : _doSignIn,
                                icon: busy
                                    ? const SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                        ),
                                      )
                                    : const Icon(Icons.login),
                                label: Text(busy ? 'Signing in...' : 'Sign In'),
                                style: FilledButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      if (!_showCodeEntry && !_showTotpSetup && !_showMfaSelection) ...[
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: Divider(
                                thickness: 1,
                                color: Colors.grey[300],
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              child: Text(
                                'OR',
                                style: TextStyle(
                                  color: Colors.grey[600],
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            Expanded(
                              child: Divider(
                                thickness: 1,
                                color: Colors.grey[300],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        OutlinedButton.icon(
                          onPressed: busy ? null : _doSignInHostedUI,
                          icon: const Icon(Icons.language),
                          label: const Text('Sign in with Hosted UI'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          TextButton(
                            onPressed: () => showModalBottomSheet(
                              context: context,
                              builder: (_) => const RegisterSheet(),
                            ),
                            child: const Text('Create account'),
                          ),
                          Text(
                            '•',
                            style: TextStyle(color: Colors.grey[400]),
                          ),
                          TextButton(
                            onPressed: () => showModalBottomSheet(
                              context: context,
                              builder: (_) => const ResetSheet(),
                            ),
                            child: const Text('Forgot password?'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

