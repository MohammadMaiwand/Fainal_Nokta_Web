import 'dart:convert';

import '../../../app/constants.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/auth/token_storage.dart';
import '../../../core/cache/offline_cache_service.dart';
import '../models/login_result.dart';
import '../models/user_profile.dart';

class AuthRepository {
  AuthRepository(this._api, this._storage, [this._cache]);

  final ApiClient _api;
  final TokenStorage _storage;
  final OfflineCacheService? _cache;

  Future<LoginResult> login({
    required String email,
    required String password,
    required bool rememberMe,
    String? expectedRole,
  }) async {
    final payload = <String, dynamic>{
      'email': email.trim(),
      'password': password,
    };
    if (expectedRole != null && expectedRole.trim().isNotEmpty) {
      payload['role'] = expectedRole.trim();
    }
    final response = await _api.post(
      ApiPaths.authLogin,
      data: payload,
    );
    final body = _unwrapLoginBody(response.data);
    if (body['twoFactorRequired'] == true) {
      return LoginTwoFactorRequired(email: email.trim());
    }
    final user = await _persistLoginResponse(body, rememberMe: rememberMe);
    return LoginSuccess(user);
  }

  Future<UserProfile> verifyLoginTwoFactor({
    required String email,
    required String code,
    required bool rememberMe,
  }) async {
    final response = await _api.post(
      ApiPaths.authLogin2fa,
      data: {'email': email.trim(), 'code': code.trim()},
    );
    final body = _unwrapLoginBody(response.data);
    return _persistLoginResponse(body, rememberMe: rememberMe);
  }

  Map<String, dynamic> _unwrapLoginBody(dynamic payload) {
    final map = _asJsonMap(payload);
    if (map == null) {
      throw ApiException(
        message: 'Unexpected login response from server',
        isNetworkError: true,
      );
    }
    if (map['success'] == false) {
      final message = '${map['message'] ?? 'Login failed'}';
      throw ApiException(message: message, isUnauthorized: true);
    }
    final nested = map['data'];
    if (nested != null) {
      final inner = _asJsonMap(nested);
      if (inner != null) return inner;
    }
    return map;
  }

  Map<String, dynamic>? _asJsonMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      return value.map((key, val) => MapEntry(key.toString(), val));
    }
    return null;
  }

  Future<UserProfile> _persistLoginResponse(
    Map<String, dynamic> body, {
    required bool rememberMe,
  }) async {
    final token = body['token'] as String? ??
        (body['tokens'] as Map?)?['accessToken'] as String?;
    final refresh = body['refreshToken'] as String? ??
        (body['tokens'] as Map?)?['refreshToken'] as String?;
    final userJson = body['user'] as Map<String, dynamic>?;
    if (token == null || userJson == null) {
      throw ApiException(message: 'Login failed');
    }
    await _storage.saveTokens(
      accessToken: token,
      refreshToken: refresh ?? '',
      rememberMe: rememberMe,
    );
    final user = UserProfile.fromJson(userJson);
    await _storage.saveUserJson(jsonEncode(user.toJson()));
    return user;
  }

  Future<UserProfile> fetchProfile() async {
    final response = await _api.get(ApiPaths.authProfile);
    final data = ApiClient.unwrapData(response.data) as Map<String, dynamic>;
    final user = UserProfile.fromJson(data);
    await _storage.saveUserJson(jsonEncode(user.toJson()));
    return user;
  }

  Future<UserProfile?> readCachedUser() async {
    final raw = await _storage.readUserJson();
    if (raw == null) return null;
    try {
      return UserProfile.fromJson(
        jsonDecode(raw) as Map<String, dynamic>,
      );
    } catch (_) {
      return null;
    }
  }

  Future<bool> hasStoredSession() async {
    final token = await _storage.readAccessToken();
    return token != null && token.isNotEmpty;
  }

  Future<void> logout() async {
    try {
      final refresh = await _storage.readRefreshToken();
      await _api.post(
        ApiPaths.authLogout,
        data: refresh != null ? {'refreshToken': refresh} : null,
      );
    } catch (_) {
      // Always clear local session even if remote logout fails.
    }
    await _storage.clearAll();
    await _cache?.clearAll();
  }
}
