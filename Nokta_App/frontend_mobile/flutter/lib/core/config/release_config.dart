import '../../app/env_config.dart';

/// Release-safe runtime configuration for API client, logging, and validation.
abstract final class ReleaseConfig {
  static const _allowedEnvironments = {'development', 'staging', 'production'};

  static bool get isProduction => EnvConfig.isProduction;
  static bool get isStaging => EnvConfig.isStaging;
  static bool get isDevelopment => EnvConfig.isDevelopment;

  /// API debug logs and bodies — never enabled in production.
  static bool get enableApiLogging => EnvConfig.enableApiDebugLogs;

  static bool get logSensitiveData => false;

  static Duration get connectTimeout =>
      isProduction ? const Duration(seconds: 12) : const Duration(seconds: 15);

  static Duration get receiveTimeout =>
      isProduction ? const Duration(seconds: 25) : const Duration(seconds: 20);

  static Duration get sendTimeout =>
      isProduction ? const Duration(seconds: 20) : const Duration(seconds: 15);

  static int get maxGetRetries => isProduction ? 1 : 2;

  /// Validates compile-time defines before the app starts.
  static void validateEnvironment() {
    final env = EnvConfig.environment;
    if (!_allowedEnvironments.contains(env)) {
      throw StateError(
        'Invalid APP_ENV "$env". Use development, staging, or production.',
      );
    }

    final url = EnvConfig.apiBaseUrl;
    if (url.isEmpty) {
      throw StateError('API_BASE_URL must not be empty.');
    }

    if (!url.endsWith('/api')) {
      throw StateError('API_BASE_URL must end with /api (got: $url)');
    }

    if (isProduction) {
      if (!url.startsWith('https://')) {
        throw StateError('Production builds require HTTPS API_BASE_URL.');
      }
      if (_isLocalHost(url)) {
        throw StateError('Production cannot use localhost or LAN API URLs.');
      }
    }
  }

  static bool _isLocalHost(String url) {
    const blocked = ['localhost', '127.0.0.1', '10.0.2.2', '192.168.', '10.'];
    return blocked.any((part) => url.contains(part));
  }
}
