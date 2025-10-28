import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;

class ApiBase {
  static String get base {
    if (kIsWeb) {
      return 'http://localhost:8080';  // Flutter Web dev
    }
    
    // For Android emulator: use 10.0.2.2 to access host machine
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:8080';
    }
    
    // For iOS simulator, Windows, Linux, macOS: use localhost
    return 'http://localhost:8080';
  }
}

