// Nokta Academy mobile app — single entry (lib/main.dart).
// Run on Android Emulator: select emulator-5554 in Android Studio device dropdown.
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/app.dart';
import 'core/cache/offline_cache_service.dart';
import 'core/config/release_config.dart';
import 'core/errors/app_error_boundary.dart';
import 'features/auth/providers/auth_provider.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  installAppErrorHandlers();
  ReleaseConfig.validateEnvironment();

  await initOfflineCache();
  final container = ProviderContainer();

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const NoktaApp(),
    ),
  );

  unawaited(container.read(authProvider.notifier).bootstrap());
}
