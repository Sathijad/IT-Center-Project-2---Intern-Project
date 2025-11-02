import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;

/// API base URL for Phase 2 Leave & Attendance API (Node.js backend on port 8082)
class ApiBasePhase2 {
  static String get base {
    if (kIsWeb) {
      return 'http://localhost:8082';  // Flutter Web dev
    }
    
    // For Android emulator: use 10.0.2.2 to access host machine
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:8082';
    }
    
    // For iOS simulator, Windows, Linux, macOS: use localhost
    return 'http://localhost:8082';
  }
}

