import 'package:flutter_test/flutter_test.dart';
import 'package:nokta_academy/app/api_url_resolver.dart';
import 'package:nokta_academy/app/env_config.dart';

void main() {
  test('default dev API uses Vite port 5173', () {
    expect(
      ApiUrlResolver.defaultDevelopmentApiUrl(),
      'http://127.0.0.1:5173/api',
    );
  });

  test('normalizeBaseUrl appends /api', () {
    expect(EnvConfig.apiBaseUrl, contains('/api'));
  });
}
