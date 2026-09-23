import 'user_profile.dart';

/// Result of the initial login request (password step).
sealed class LoginResult {
  const LoginResult();
}

class LoginSuccess extends LoginResult {
  const LoginSuccess(this.user);
  final UserProfile user;
}

class LoginTwoFactorRequired extends LoginResult {
  const LoginTwoFactorRequired({required this.email});
  final String email;
}
