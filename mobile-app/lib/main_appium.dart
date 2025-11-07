import 'package:flutter/widgets.dart';
import 'package:flutter_driver/driver_extension.dart';

import 'main.dart' as app;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  enableFlutterDriverExtension();
  await app.main();
}

