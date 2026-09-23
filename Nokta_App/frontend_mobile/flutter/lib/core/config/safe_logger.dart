import 'package:flutter/foundation.dart';

import 'release_config.dart';

/// Redacted logging — disabled in production releases.
abstract final class SafeLogger {
  static final _bearerPattern = RegExp(r'Bearer\s+[A-Za-z0-9._-]+');
  static final _secretPattern = RegExp(
    r'(password|token|refreshToken|accessToken)\s*[:=]\s*\S+',
    caseSensitive: false,
  );

  static void debug(String message) {
    if (!ReleaseConfig.enableApiLogging) return;
    debugPrint(_redact(message));
  }

  static void api(String message) {
    if (!ReleaseConfig.enableApiLogging) return;
    debugPrint('[API] ${_redact(message)}');
  }

  static String _redact(String input) {
    return input
        .replaceAll(_bearerPattern, 'Bearer [REDACTED]')
        .replaceAll(_secretPattern, '[REDACTED]');
  }
}
