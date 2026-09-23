import 'api_url_resolver.dart';
import 'env_config_platform.dart';

/// API URL for the Nokta mobile app (Android / iOS).
abstract final class EnvConfig {
  /// Empty = use platform resolver (dev: Vite `5173/api` like the web app).
  static const String _apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );

  static const String _environment = String.fromEnvironment(
    'APP_ENV',
    defaultValue: 'development',
  );

  static String get apiBaseUrl =>
      resolveMobileApiBaseUrl(_apiBaseUrl, _normalizeBaseUrl);

  static String get environment => _normalizedEnvironment;

  static String get _normalizedEnvironment {
    final raw = _environment.trim().toLowerCase();
    if (raw.isEmpty) return 'development';
    return raw;
  }

  static bool get isDevelopment => _normalizedEnvironment == 'development';
  static bool get isStaging => _normalizedEnvironment == 'staging';
  static bool get isProduction => _normalizedEnvironment == 'production';

  static bool get enableApiDebugLogs => !isProduction;

  static String get environmentLabel {
    return switch (_normalizedEnvironment) {
      'production' => 'Production',
      'staging' => 'Staging',
      _ => 'Development',
    };
  }

  static String _normalizeBaseUrl(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) {
      return ApiUrlResolver.defaultDevelopmentApiUrl();
    }
    var url = trimmed.endsWith('/') ? trimmed.substring(0, trimmed.length - 1) : trimmed;
    if (!url.endsWith('/api')) {
      if (!url.contains('/api')) url = '$url/api';
    }
    return url;
  }
}
