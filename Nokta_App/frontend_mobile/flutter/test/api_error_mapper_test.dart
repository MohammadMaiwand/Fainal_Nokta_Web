import 'package:flutter_test/flutter_test.dart';
import 'package:nokta_academy/core/api/api_exception.dart';
import 'package:nokta_academy/core/utils/api_error_mapper.dart';
import 'package:nokta_academy/core/widgets/app_error_views.dart';

void main() {
  test('maps timeout to network error type', () {
    final type = appErrorTypeFor(
      ApiException(message: 'timeout', isTimeout: true, isNetworkError: true),
    );
    expect(type, AppErrorType.network);
  });

  test('maps 403 to permission', () {
    final type = appErrorTypeFor(
      ApiException(message: 'denied', isPermissionDenied: true, statusCode: 403),
    );
    expect(type, AppErrorType.permission);
  });

  test('maps 401 to session expired', () {
    final type = appErrorTypeFor(
      ApiException(message: 'unauthorized', isUnauthorized: true, statusCode: 401),
    );
    expect(type, AppErrorType.sessionExpired);
  });
}
