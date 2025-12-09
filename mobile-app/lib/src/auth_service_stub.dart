import 'dart:developer';

/// Stub implementation of AuthService for web platform
/// Amplify Cognito has compatibility issues with Flutter web
class AuthService {
  AuthService._();
  static final instance = AuthService._();

  bool _configured = false;

  Future<void> init() async {
    if (_configured) return;
    log('AuthService: Web platform - Amplify initialization skipped');
    _configured = true;
  }

  Future<SignInResult> signInEmail(String email, String password) async {
    throw UnimplementedError('Sign in not available on web platform');
  }

  Future<SignInResult> confirmSignInMfa(String code) async {
    throw UnimplementedError('MFA confirmation not available on web platform');
  }

  Future<void> signOut() async {
    log('AuthService: Web platform - Sign out skipped');
  }

  Future<AuthUserStub?> getCurrentUser() async {
    return null;
  }

  Future<TotpSetupResult> setupTotp({Map<String, dynamic>? additionalInfo}) async {
    throw UnimplementedError('TOTP setup not available on web platform');
  }

  Future<SignInResult> confirmTotpSetup(String code) async {
    throw UnimplementedError('TOTP confirmation not available on web platform');
  }

  Future<SignInResult> selectMfaMethod(bool useTotp, {Map<String, dynamic>? additionalInfoFromSignIn}) async {
    throw UnimplementedError('MFA method selection not available on web platform');
  }

  Future<void> signInHostedUI() async {
    throw UnimplementedError('Hosted UI sign in not available on web platform');
  }

  Future<String?> getAccessToken({bool forceRefresh = false}) async {
    return null;
  }

  Future<String?> getIdToken({bool forceRefresh = false}) async {
    return null;
  }

  Future<void> signUpEmail(String email, String password) async {
    throw UnimplementedError('Sign up not available on web platform');
  }

  Future<void> confirmSignUp(String email, String code) async {
    throw UnimplementedError('Confirm sign up not available on web platform');
  }

  Future<void> resetPasswordStart(String email) async {
    throw UnimplementedError('Reset password not available on web platform');
  }

  Future<void> resetPasswordConfirm(String email, String code, String newPw) async {
    throw UnimplementedError('Reset password confirm not available on web platform');
  }
}

// Stub classes
class SignInResult {
  final bool isComplete;
  final dynamic nextStep;
  final String? codeDeliveryDestination;
  final Map<String, dynamic>? additionalInfo;

  SignInResult({
    required this.isComplete,
    this.nextStep,
    this.codeDeliveryDestination,
    this.additionalInfo,
  });
}

class TotpSetupResult {
  final String secretCode;
  TotpSetupResult({required this.secretCode});
}

// Use a different name to avoid conflict with amplify_core's AuthUser
class AuthUserStub {
  final String userId;
  AuthUserStub({required this.userId});
}

// Alias for compatibility
typedef AuthUser = AuthUserStub;

