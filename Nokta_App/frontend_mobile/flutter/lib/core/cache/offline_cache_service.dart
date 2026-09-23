import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists successful GET responses for offline read.
class OfflineCacheService {
  OfflineCacheService(this._prefs);

  final SharedPreferences _prefs;
  static const _prefix = 'nokta_cache_v2:';

  static bool shouldCache(int? statusCode, String method) {
    final m = method.toUpperCase();
    if (m != 'GET') return false;
    if (statusCode == null || statusCode < 200 || statusCode >= 300) return false;
    if (statusCode == 401 || statusCode == 403) return false;
    return true;
  }

  String buildKey(String path, Map<String, dynamic>? query) {
    final params = <String, String>{};
    query?.forEach((k, v) {
      if (v != null && '$v'.isNotEmpty) params[k] = '$v';
    });
    final keys = params.keys.toList()..sort();
    final queryString = keys.map((k) => '$k=${params[k]}').join('&');
    return '$_prefix$path${queryString.isEmpty ? '' : '?$queryString'}';
  }

  Future<void> put(String key, dynamic data) async {
    await _prefs.setString(
      key,
      jsonEncode({
        'cachedAt': DateTime.now().toIso8601String(),
        'data': data,
      }),
    );
  }

  Future<dynamic> get(String key) async {
    final raw = _prefs.getString(key);
    if (raw == null) return null;
    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      return decoded['data'];
    } catch (_) {
      return null;
    }
  }

  Future<void> clearAll() async {
    final keys = _prefs.getKeys().where((k) => k.startsWith(_prefix));
    for (final key in keys) {
      await _prefs.remove(key);
    }
  }

  Future<int> entryCount() async {
    return _prefs.getKeys().where((k) => k.startsWith(_prefix)).length;
  }
}

SharedPreferences? _sharedPrefs;

Future<void> initOfflineCache() async {
  _sharedPrefs ??= await SharedPreferences.getInstance();
}

final offlineCacheServiceProvider = Provider<OfflineCacheService>((ref) {
  final prefs = _sharedPrefs;
  if (prefs == null) {
    throw StateError('Call initOfflineCache() before runApp');
  }
  return OfflineCacheService(prefs);
});

/// Tracks when UI is showing cached GET data.
final showingCachedDataProvider = StateProvider<bool>((ref) => false);
