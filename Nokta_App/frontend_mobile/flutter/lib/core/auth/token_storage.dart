import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../app/constants.dart';

/// Persists auth tokens; keeps an in-memory copy so the next API call after login
/// does not race secure storage (especially on Flutter web).
class TokenStorage {
  TokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(
                encryptedSharedPreferences: true,
                resetOnError: true,
              ),
            );

  final FlutterSecureStorage _storage;

  String? _memoryAccessToken;
  String? _memoryRefreshToken;
  String? _memoryUserJson;

  Future<String?> readAccessToken() async {
    if (_memoryAccessToken != null && _memoryAccessToken!.isNotEmpty) {
      return _memoryAccessToken;
    }
    return _storage.read(key: StorageKeys.accessToken);
  }

  Future<String?> readRefreshToken() async {
    if (_memoryRefreshToken != null && _memoryRefreshToken!.isNotEmpty) {
      return _memoryRefreshToken;
    }
    return _storage.read(key: StorageKeys.refreshToken);
  }

  Future<bool> readRememberMe() async {
    final value = await _storage.read(key: StorageKeys.rememberMe);
    return value == 'true';
  }

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
    required bool rememberMe,
  }) async {
    _memoryAccessToken = accessToken;
    _memoryRefreshToken = refreshToken;
    await _storage.write(key: StorageKeys.accessToken, value: accessToken);
    await _storage.write(key: StorageKeys.refreshToken, value: refreshToken);
    await _storage.write(key: StorageKeys.rememberMe, value: rememberMe.toString());
  }

  Future<void> saveUserJson(String json) async {
    _memoryUserJson = json;
    await _storage.write(key: StorageKeys.userJson, value: json);
  }

  Future<String?> readUserJson() async {
    if (_memoryUserJson != null && _memoryUserJson!.isNotEmpty) {
      return _memoryUserJson;
    }
    return _storage.read(key: StorageKeys.userJson);
  }

  Future<void> clearAll() async {
    _memoryAccessToken = null;
    _memoryRefreshToken = null;
    _memoryUserJson = null;
    await _storage.delete(key: StorageKeys.accessToken);
    await _storage.delete(key: StorageKeys.refreshToken);
    await _storage.delete(key: StorageKeys.rememberMe);
    await _storage.delete(key: StorageKeys.userJson);
  }
}
