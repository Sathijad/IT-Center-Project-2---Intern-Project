import 'dart:developer';
import 'package:amplify_auth_cognito/amplify_auth_cognito.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import '../amplifyconfiguration.dart';

class AuthService {
  AuthService._();
  static final instance = AuthService._();

  bool _configured = false;

  Future<void> init() async {
    if (_configured) return;
    try {
      await Amplify.addPlugin(AmplifyAuthCognito());
      await Amplify.configure(getAmplifyConfig());
      _configured = true;
    } on AmplifyAlreadyConfiguredException {
      _configured = true;
    } catch (e) {
      log('Amplify init failed: $e');
      rethrow;
    }
  }

  /// Hosted UI (PKCE). Handles MFA challenges inside Cognito UI.
  /// Can also be used to set up MFA when already signed in.
  Future<void> signInHostedUI() async {
    await Amplify.Auth.signInWithWebUI(provider: AuthProvider.cognito);
  }

  Future<void> signOut() async {
    await Amplify.Auth.signOut();
  }

  // --- Registration / confirmation ---
  Future<void> signUpEmail(String email, String password) async {
    final res = await Amplify.Auth.signUp(
      username: email,
      password: password,
    );
    if (!res.isSignUpComplete) {
      // Wait for confirm code via email/SMS depending on pool config
    }
  }

  Future<void> confirmSignUp(String email, String code) async {
    await Amplify.Auth.confirmSignUp(username: email, confirmationCode: code);
  }

  // --- Password reset ---
  Future<void> resetPasswordStart(String email) async {
    await Amplify.Auth.resetPassword(username: email);
  }

  Future<void> resetPasswordConfirm(String email, String code, String newPw) async {
    await Amplify.Auth.confirmResetPassword(username: email, newPassword: newPw, confirmationCode: code);
  }

  // --- Tokens for backend calls ---
  Future<String?> getAccessToken() async {
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

