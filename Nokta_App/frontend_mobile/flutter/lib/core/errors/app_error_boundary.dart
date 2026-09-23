import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../config/safe_logger.dart';

/// Catches framework errors and logs safely without crashing silently in debug.
void installAppErrorHandlers() {
  ErrorWidget.builder = (details) => const AppErrorFallback();

  FlutterError.onError = (details) {
    SafeLogger.debug('FlutterError: ${details.exceptionAsString()}');
    if (kDebugMode) {
      FlutterError.presentError(details);
    }
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    SafeLogger.debug('Uncaught: $error');
    return true;
  };
}

/// Fallback UI when a widget fails to build.
class AppErrorFallback extends StatelessWidget {
  const AppErrorFallback({super.key});

  @override
  Widget build(BuildContext context) {
    return const Material(
      child: Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Something went wrong. Please restart the app.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 16),
          ),
        ),
      ),
    );
  }
}
