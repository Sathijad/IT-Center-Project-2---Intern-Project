import 'package:flutter/foundation.dart' show kIsWeb;

class ApiBase {
  static String get base {
    if (kIsWeb) {
      return 'http://localhost:8080';  // Flutter Web dev
    }
    
    // For iOS simulator / Windows desktop
    return 'http://localhost:8080';
    
    // For Android emulator only (uncomment when testing on Android):
    // return 'http://10.0.2.2:8080';
  }
}

