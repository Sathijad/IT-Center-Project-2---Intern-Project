import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'amplifyconfiguration_mobile.dart';
import 'amplifyconfiguration_web.dart';

String getAmplifyConfig() {
  if (kIsWeb) {
    return _buildWebConfigForCurrentOrigin();
  }
  
  if (Platform.isAndroid || Platform.isIOS) {
    return amplifyconfigMobile;
  }
  
  // Fallback for desktop (Windows/Linux/macOS) - use web config for development
  return amplifyconfigWeb;
}

String _buildWebConfigForCurrentOrigin() {
  final origin = Uri.base.origin;
  if (origin.isEmpty) {
    return amplifyconfigWeb;
  }

  try {
    final Map<String, dynamic> config = jsonDecode(amplifyconfigWeb) as Map<String, dynamic>;
    final oauth = config['auth']?['plugins']?['awsCognitoAuthPlugin']?['Auth']?['Default']?['OAuth'] as Map<String, dynamic>?;

    if (oauth != null) {
      final redirect = origin.endsWith('/') ? origin : '$origin/';
      oauth['SignInRedirectURI'] = redirect;
      oauth['SignOutRedirectURI'] = redirect;
    }

    return jsonEncode(config);
  } catch (_) {
    // Fallback to the static config if parsing fails for any reason.
    return amplifyconfigWeb;
  }
}

