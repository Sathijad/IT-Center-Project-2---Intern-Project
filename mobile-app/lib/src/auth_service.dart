import 'dart:developer';
import 'package:amplify_auth_cognito/amplify_auth_cognito.dart';
import 'package:amplify_flutter/amplify_flutter.dart';
import '../amplifyconfiguration.dart';

/// Result of a sign-in attempt
class SignInResult {
  final bool isComplete;
  final AuthSignInStep? nextStep;
  final String? codeDeliveryDestination;
  final Map<String, dynamic>? additionalInfo; // Store additional info like TOTP secret

  SignInResult({
    required this.isComplete,
    this.nextStep,
    this.codeDeliveryDestination,
    this.additionalInfo,
  });
}

/// Result of TOTP setup
class TotpSetupResult {
  final String secretCode;
  
  TotpSetupResult({required this.secretCode});
}

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

  /// Direct email/password sign-in using Amplify Auth
  /// Returns SignInResult indicating if sign-in is complete or what step is needed next
  Future<SignInResult> signInEmail(String email, String password) async {
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
      
      // Extract code delivery destination and other info if available
      Map<String, dynamic>? additionalInfo;
      if (result.nextStep.additionalInfo != null) {
        additionalInfo = Map<String, dynamic>.from(result.nextStep.additionalInfo!);
        codeDeliveryDestination = additionalInfo?['destination'];
      }

      return SignInResult(
        isComplete: false,
        nextStep: nextStep,
        codeDeliveryDestination: codeDeliveryDestination,
        additionalInfo: additionalInfo,
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
    try {
      await Amplify.Auth.signInWithWebUI(provider: AuthProvider.cognito);
    } on AuthException catch (e) {
      log('Hosted UI sign in failed: ${e.message}');
      rethrow;
    }
  }

  Future<void> signOut() async {
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

  /// Setup TOTP and get the secret key for QR code generation
  /// For continueSignInWithTotpSetup, we need to first associate the software token
  /// The secret code might already be in the sign-in result's additionalInfo
  Future<TotpSetupResult> setupTotp({Map<String, dynamic>? additionalInfo}) async {
    try {
      // Check if secret is already in additionalInfo (from sign-in result)
      String? secretCode;
      if (additionalInfo != null) {
        secretCode = additionalInfo['secretCode'] ?? additionalInfo['secret'] ?? additionalInfo['sharedSecret'];
        log('Secret from additionalInfo: ${secretCode != null ? 'found' : 'not found'}');
      }
      
      // If not found, try to set up TOTP
      if (secretCode == null || secretCode.isEmpty) {
        try {
          log('Attempting to call setUpTotp...');
          // Call setUpTotp - handle it dynamically since we don't know the exact return type
          final setupResult = await Amplify.Auth.setUpTotp();
          log('setUpTotp returned: ${setupResult.runtimeType}');
          
          // Try to extract secret from result using dynamic access
          dynamic resultDynamic = setupResult;
          
          // Try various possible property names
          secretCode = resultDynamic.secretCode ?? 
                      resultDynamic.secret ?? 
                      resultDynamic.sharedSecret ?? 
                      resultDynamic.code;
          
          // If still not found, try Map access
          if ((secretCode == null || secretCode.isEmpty) && setupResult is Map) {
            final map = setupResult as Map;
            secretCode = map['secretCode'] ?? map['secret'] ?? map['sharedSecret'] ?? map['code'];
          }
          
          log('Extracted secret code: ${secretCode != null && secretCode.isNotEmpty ? 'found' : 'not found'}');
        } catch (e) {
          log('setUpTotp failed: $e');
          // If setUpTotp fails, we might need to get it from the sign-in flow
          // Try confirming sign-in with empty string first to continue the flow
          try {
            log('Attempting to continue sign-in with empty string to get secret...');
            final continueResult = await Amplify.Auth.confirmSignIn(confirmationValue: '');
            if (continueResult.nextStep.additionalInfo != null) {
              final continueInfo = Map<String, dynamic>.from(continueResult.nextStep.additionalInfo!);
              secretCode = continueInfo['secretCode'] ?? continueInfo['secret'] ?? continueInfo['sharedSecret'];
              log('Secret from continueResult: ${secretCode != null ? 'found' : 'not found'}');
            }
          } catch (continueError) {
            log('Continue sign-in also failed: $continueError');
          }
          
          if (secretCode == null || secretCode.isEmpty) {
            throw Exception('TOTP secret not available. Please check Cognito MFA settings. Error: $e');
          }
        }
      }
      
      if (secretCode == null || secretCode.isEmpty) {
        throw Exception('Secret code is empty. TOTP setup might not be properly configured.');
      }
      
      log('TOTP setup successful, secret code obtained');
      return TotpSetupResult(secretCode: secretCode);
    } on AuthException catch (e) {
      log('TOTP setup failed: ${e.message}');
      rethrow;
    } catch (e) {
      log('TOTP setup error: $e');
      if (e is Exception) rethrow;
      throw Exception('TOTP setup failed: ${e.toString()}');
    }
  }

  /// Select MFA method (TOTP or SMS) during sign-in
  /// When continueSignInWithMfaSetupSelection is active, we need to select the MFA method
  /// Based on AWS Cognito API, we need to confirm sign-in with SOFTWARE_TOKEN_MFA or SMS_MFA
  /// However, some implementations might need empty string or different format
  Future<SignInResult> selectMfaMethod(bool useTotp, {Map<String, dynamic>? additionalInfoFromSignIn}) async {
    try {
      log('Selecting MFA method: ${useTotp ? "TOTP" : "SMS"}');
      log('Additional info from sign-in: $additionalInfoFromSignIn');
      
      // Try different confirmation values based on Cognito requirements
      // The 400 error suggests the format might be wrong
      List<String> confirmationValuesToTry;
      
      if (useTotp) {
        // For TOTP, try multiple formats
        confirmationValuesToTry = ['SOFTWARE_TOKEN_MFA', '', 'TOTP'];
      } else {
        // For SMS, try SMS_MFA
        confirmationValuesToTry = ['SMS_MFA'];
      }
      
      AuthException? lastException;
      
      for (final confirmationValue in confirmationValuesToTry) {
        try {
          log('Trying confirmSignIn with: "$confirmationValue"');
          final result = await Amplify.Auth.confirmSignIn(confirmationValue: confirmationValue);
          
          log('MFA method selected successfully, next step: ${result.nextStep.signInStep}');
          
          if (result.isSignedIn) {
            return SignInResult(isComplete: true);
          }
          
          // Extract additional info and next step
          String? codeDeliveryDestination;
          Map<String, dynamic>? additionalInfo;
          if (result.nextStep.additionalInfo != null) {
            additionalInfo = Map<String, dynamic>.from(result.nextStep.additionalInfo!);
            codeDeliveryDestination = additionalInfo?['destination'];
          }
          
          return SignInResult(
            isComplete: false,
            nextStep: result.nextStep.signInStep,
            codeDeliveryDestination: codeDeliveryDestination,
            additionalInfo: additionalInfo,
          );
        } on AuthException catch (e) {
          log('Failed with "$confirmationValue": ${e.message}');
          lastException = e;
          // Continue to next value
          continue;
        }
      }
      
      // If all attempts failed, throw the last exception
      if (lastException != null) {
        throw lastException;
      }
      
      throw Exception('All MFA selection attempts failed');
    } on AuthException catch (e) {
      log('MFA method selection failed: ${e.message}');
      rethrow;
    } catch (e) {
      log('MFA method selection error: $e');
      throw Exception('MFA method selection failed: ${e.toString()}');
    }
  }

  /// Verify TOTP code and complete the TOTP setup during sign-in
  /// When continueSignInWithTotpSetup is active, confirmSignIn with the code completes setup
  Future<SignInResult> confirmTotpSetup(String code) async {
    try {
      // During sign-in with continueSignInWithTotpSetup, we confirm sign-in with the TOTP code
      // This both verifies the token and completes the sign-in
      final result = await Amplify.Auth.confirmSignIn(confirmationValue: code.trim());
      
      log('TOTP confirmation completed');
      
      if (result.isSignedIn) {
        return SignInResult(isComplete: true);
      }
      
      // If there's another step needed
      String? codeDeliveryDestination;
      Map<String, dynamic>? additionalInfo;
      if (result.nextStep.additionalInfo != null) {
        additionalInfo = Map<String, dynamic>.from(result.nextStep.additionalInfo!);
        codeDeliveryDestination = additionalInfo?['destination'];
      }
      
      return SignInResult(
        isComplete: false,
        nextStep: result.nextStep.signInStep,
        codeDeliveryDestination: codeDeliveryDestination,
        additionalInfo: additionalInfo,
      );
    } on AuthException catch (e) {
      log('TOTP confirmation failed: ${e.message}');
      rethrow;
    } catch (e) {
      log('TOTP confirmation error: $e');
      throw Exception('TOTP confirmation failed: ${e.toString()}');
    }
  }

  // --- Tokens for backend calls ---
  Future<String?> getAccessToken({bool forceRefresh = false}) async {
    try {
      final session = await Amplify.Auth.fetchAuthSession(
        options: FetchAuthSessionOptions(forceRefresh: forceRefresh),
      );
      
      if (session is CognitoAuthSession) {
        // Get tokens safely
        final tokens = session.userPoolTokensResult.valueOrNull;
        if (tokens == null) return null;

        // Prefer access token, fall back to id token if needed
        final accessToken = tokens.accessToken.raw;
        if (accessToken.isNotEmpty) {
          return accessToken;
        }

        final idToken = tokens.idToken.raw;
        return idToken.isNotEmpty ? idToken : null;
      }
      return null;
    } catch (e) {
      log('Failed to get access token: $e');
      return null;
    }
  }
}

