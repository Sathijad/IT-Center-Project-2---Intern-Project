import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;

class BookingApiBase {
  static String get base {
    const override = String.fromEnvironment('BOOKING_API_BASE', defaultValue: '');
    if (override.isNotEmpty) {
      return override;
    }

    const useLocalPhase3 = bool.fromEnvironment('USE_LOCAL_PHASE3', defaultValue: false);
    if (useLocalPhase3) {
      if (kIsWeb) {
        return 'http://localhost:3001'; // Flutter Web dev
      }

      if (!kIsWeb && Platform.isAndroid) {
        return 'http://10.0.2.2:3001';
      }

      return 'http://localhost:3001';
    }

    // Default to production API Gateway URL (update with actual URL after deployment)
    return 'https://placeholder.execute-api.ap-southeast-2.amazonaws.com';
  }
}

