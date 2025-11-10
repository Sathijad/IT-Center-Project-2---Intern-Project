import 'dart:developer';
import 'package:amplify_auth_cognito/amplify_auth_cognito.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import 'package:flutter/foundation.dart';
import '../amplifyconfiguration.dart';

/// Result of a sign-in attempt
class SignInResult {
  final bool isComplete;
  final AuthSignInStep? nextStep;
  final String? codeDeliveryDestination;

  SignInResult({
    required this.isComplete,
    this.nextStep,
    this.codeDeliveryDestination,
  });
}

class AuthService {
  AuthService._();
  static final instance = AuthService._();

  bool _configured = false;
  final ValueNotifier<bool> _testSignedIn = ValueNotifier<bool>(false);
  Map<String, dynamic>? _testUserProfile;
  
  // Check if we're in E2E test mode
  static bool get isE2ETest => const bool.fromEnvironment('E2E_TEST', defaultValue: false);

  ValueNotifier<bool> get testSignedInNotifier => _testSignedIn;
  bool get isTestSignedIn => _testSignedIn.value;
  Map<String, dynamic> get testUserProfile =>
      _testUserProfile ??
      {
        'displayName': 'Admin User',
        'email': 'admin@test.com',
        'roles': const ['ADMIN'],
        'locale': 'en_US',
      };

  Future<void> init() async {
    if (_configured) return;
    
    // Skip Amplify init in E2E test mode to avoid crashes
    if (isE2ETest) {
      log('E2E_TEST mode: Skipping Amplify configuration');
      _configured = true;
      return;
    }
    
    try {
      await Amplify.addPlugin(AmplifyAuthCognito());
      await Amplify.configure(getAmplifyConfig());
      _configured = true;
    } on AmplifyAlreadyConfiguredException {
      _configured = true;
    } catch (e) {
      log('Amplify init failed: $e');
      // In E2E mode, don't rethrow - just log and continue
      if (!isE2ETest) {
        rethrow;
      }
    }
  }

  /// Direct email/password sign-in using Amplify Auth
  /// Returns SignInResult indicating if sign-in is complete or what step is needed next
  Future<SignInResult> signInEmail(String email, String password) async {
    if (isE2ETest) {
      final resolvedEmail =
          email.trim().isEmpty ? 'admin@test.com' : email.trim();
      _testUserProfile = {
        'displayName': 'Admin User',
        'email': resolvedEmail,
        'roles': const ['ADMIN'],
        'locale': 'en_US',
      };
      _testSignedIn.value = true;
      return SignInResult(isComplete: true);
    }

    try {
      final result = await Amplify.Auth.signIn(
        username: email.trim(),
        password: password,
      );

      // Check if sign-in is complete
      if (result.isSignedIn) {
        return SignInResult(isComplete: true);
      }

      // Return information about next step needed
      final nextStep = result.nextStep.signInStep;
      String? codeDeliveryDestination;
      
      // Extract code delivery destination if available
      if (result.nextStep.additionalInfo != null) {
        codeDeliveryDestination = result.nextStep.additionalInfo?['destination'];
      }

      return SignInResult(
        isComplete: false,
        nextStep: nextStep,
        codeDeliveryDestination: codeDeliveryDestination,
      );
    } on AuthException catch (e) {
      log('Sign in failed: ${e.message}');
      // Re-throw the AuthException as-is (it contains proper error information)
      rethrow;
    } catch (e) {
      log('Sign in error: $e');
      throw Exception('Sign in failed: ${e.toString()}');
    }
  }

  /// Confirm sign-in with MFA/verification code
  Future<SignInResult> confirmSignInMfa(String code) async {
    if (isE2ETest) {
      _testSignedIn.value = true;
      return SignInResult(isComplete: true);
    }

    try {
      final result = await Amplify.Auth.confirmSignIn(confirmationValue: code.trim());
      
      if (result.isSignedIn) {
        return SignInResult(isComplete: true);
      }
      
      return SignInResult(
        isComplete: false,
        nextStep: result.nextStep.signInStep,
      );
    } on AuthException catch (e) {
      log('MFA confirmation failed: ${e.message}');
      // Re-throw the AuthException as-is
      rethrow;
    }
  }

  /// Hosted UI (PKCE). Handles MFA challenges inside Cognito UI.
  /// Can also be used to set up MFA when already signed in.
  Future<void> signInHostedUI() async {
    if (isE2ETest) {
      _testSignedIn.value = true;
      return;
    }

    try {
      await Amplify.Auth.signInWithWebUI(provider: AuthProvider.cognito);
    } on AuthException catch (e) {
      log('Hosted UI sign in failed: ${e.message}');
      rethrow;
    }
  }

  Future<void> signOut() async {
    if (isE2ETest) {
      _testSignedIn.value = false;
      _testUserProfile = null;
      return;
    }

    try {
      await Amplify.Auth.signOut();
    } on AuthException catch (e) {
      log('Sign out failed: ${e.message}');
      rethrow;
    }
  }

  // --- Registration / confirmation ---
  Future<void> signUpEmail(String email, String password) async {
    try {
      final res = await Amplify.Auth.signUp(
        username: email.trim(),
        password: password,
      );
      if (!res.isSignUpComplete) {
        // Wait for confirm code via email/SMS depending on pool config
        log('Sign up initiated, confirmation required');
      }
    } on AuthException catch (e) {
      log('Sign up failed: ${e.message}');
      rethrow;
    } catch (e) {
      log('Sign up error: $e');
      throw Exception('Sign up failed. Please check your information and try again');
    }
  }

  Future<void> confirmSignUp(String email, String code) async {
    try {
      await Amplify.Auth.confirmSignUp(
        username: email.trim(),
        confirmationCode: code.trim(),
      );
    } on AuthException catch (e) {
      log('Confirm sign up failed: ${e.message}');
      rethrow;
    }
  }

  // --- Password reset ---
  Future<void> resetPasswordStart(String email) async {
    try {
      await Amplify.Auth.resetPassword(username: email.trim());
    } on AuthException catch (e) {
      log('Reset password start failed: ${e.message}');
      rethrow;
    }
  }

  Future<void> resetPasswordConfirm(String email, String code, String newPw) async {
    try {
      await Amplify.Auth.confirmResetPassword(
        username: email.trim(),
        newPassword: newPw,
        confirmationCode: code.trim(),
      );
    } on AuthException catch (e) {
      log('Reset password confirm failed: ${e.message}');
      rethrow;
    }
  }

  // --- Tokens for backend calls ---
  Future<String?> getAccessToken() async {
    if (isE2ETest) {
      return 'e2e-test-token';
    }

    try {
      final session = await Amplify.Auth.fetchAuthSession();
      
      if (session is CognitoAuthSession) {
        // Get tokens safely
        final tokens = session.userPoolTokensResult.valueOrNull;
        if (tokens == null) return null;

        // Return the raw JWT string (not toString())
        return tokens.accessToken.raw;
      }
      return null;
    } catch (e) {
      log('Failed to get access token: $e');
      return null;
    }
  }
}

