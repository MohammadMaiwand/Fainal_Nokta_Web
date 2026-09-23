import 'package:flutter_test/flutter_test.dart';
import 'package:nokta_academy/features/auth/models/login_result.dart';

void main() {
  test('LoginTwoFactorRequired carries email', () {
    const result = LoginTwoFactorRequired(email: 'user@school.com');
    expect(result.email, 'user@school.com');
  });
}
