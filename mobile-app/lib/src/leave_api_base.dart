import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;

class LeaveApiBase {
  static String get base {
    const override = String.fromEnvironment('LEAVE_API_BASE', defaultValue: '');
    if (override.isNotEmpty) {
      return override;
    }

    const useLocalPhase2 = bool.fromEnvironment('USE_LOCAL_PHASE2', defaultValue: false);
    if (useLocalPhase2) {
      if (kIsWeb) {
        return 'http://localhost:3000'; // Flutter Web dev
      }

      if (!kIsWeb && Platform.isAndroid) {
        return 'http://10.0.2.2:3000';
      }

      return 'http://localhost:3000';
    }

    return 'https://xfub6mzcqg.execute-api.ap-southeast-2.amazonaws.com';
  }
}

