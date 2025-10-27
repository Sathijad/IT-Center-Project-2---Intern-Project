import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'amplifyconfiguration_mobile.dart';
import 'amplifyconfiguration_web.dart';

String getAmplifyConfig() {
  if (kIsWeb) {
    return amplifyconfigWeb;
  }
  
  if (Platform.isAndroid || Platform.isIOS) {
    return amplifyconfigMobile;
  }
  
  // Fallback for desktop (Windows/Linux/macOS) - use web config for development
  return amplifyconfigWeb;
}

