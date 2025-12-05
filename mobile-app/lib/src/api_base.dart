import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;

class ApiBase {
  // Auth backend (port 8080)
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
  
  // Schedules backend (port 5166)
  static String get schedulesBase {
    if (kIsWeb) {
      return 'http://localhost:5166';  // Flutter Web dev
    }
    
    // For Android emulator: use 10.0.2.2 to access host machine
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:5166';
    }
    
    // For iOS simulator, Windows, Linux, macOS: use localhost
    return 'http://localhost:5166';
  }

  static String get eventsBase {
    if (kIsWeb) {
      return 'http://localhost:8085';
    }
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:8085';
    }
    return 'http://localhost:8085';
  }

  // Performance backend (port 5167)
  static String get performanceBase {
    if (kIsWeb) {
      return 'http://localhost:5167';
    }
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:5167';
    }
    return 'http://localhost:5167';
  }

  // Feedback backend (port 8086)
  static String get feedbackBase {
    if (kIsWeb) {
      return 'http://localhost:8086';
    }
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:5167';
    }
    return 'http://localhost:5167';
  }
}

