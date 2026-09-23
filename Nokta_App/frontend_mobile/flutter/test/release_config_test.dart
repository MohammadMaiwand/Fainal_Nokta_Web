import 'package:flutter_test/flutter_test.dart';
import 'package:nokta_academy/app/env_config.dart';
import 'package:nokta_academy/core/config/release_config.dart';

void main() {
  test('development environment allows local API default', () {
    expect(EnvConfig.isDevelopment, isTrue);
    expect(() => ReleaseConfig.validateEnvironment(), returnsNormally);
  });

  test('production flag follows APP_ENV define', () {
    expect(ReleaseConfig.isProduction, EnvConfig.isProduction);
  });

  test('API logging disabled in production mode', () {
    if (EnvConfig.isProduction) {
      expect(ReleaseConfig.enableApiLogging, isFalse);
    }
  });

  test('timeouts are positive durations', () {
    expect(ReleaseConfig.connectTimeout.inSeconds, greaterThan(0));
    expect(ReleaseConfig.receiveTimeout.inSeconds, greaterThan(0));
  });
}
