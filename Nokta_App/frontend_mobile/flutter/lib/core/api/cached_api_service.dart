import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../cache/offline_cache_service.dart';
import '../network/network_status.dart';
import 'api_client.dart';
import 'api_exception.dart';

/// Wraps GET with offline cache read/write.
class CachedApiService {
  CachedApiService(this._client, this._cache, this._ref);

  final ApiClient _client;
  final OfflineCacheService _cache;
  final Ref _ref;

  Future<Response<dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    bool allowRetry = true,
  }) async {
    final key = _cache.buildKey(path, queryParameters);
    try {
      final response = await _client.get<dynamic>(
        path,
        queryParameters: queryParameters,
        allowRetry: allowRetry,
      );
      if (OfflineCacheService.shouldCache(response.statusCode, 'GET')) {
        await _cache.put(key, response.data);
      }
      _ref.read(showingCachedDataProvider.notifier).state = false;
      return response;
    } on ApiException catch (e) {
      if (e.isNetworkError || e.statusCode == null) {
        final cached = await _cache.get(key);
        if (cached != null) {
          _ref.read(showingCachedDataProvider.notifier).state = true;
          return Response(
            requestOptions: RequestOptions(path: path),
            data: cached,
            statusCode: 200,
          );
        }
      }
      rethrow;
    }
  }

  Future<Response<dynamic>> post(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
  }) {
    _ensureOnline();
    return _client.post(path, data: data, queryParameters: queryParameters);
  }

  Future<Response<dynamic>> patch(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
  }) {
    _ensureOnline();
    return _client.patch(path, data: data, queryParameters: queryParameters);
  }

  void _ensureOnline() {
    final online = _ref.read(networkOnlineProvider).value;
    if (online == false) {
      throw ApiException(
        message: 'offline',
        isNetworkError: true,
      );
    }
  }
}

final cachedApiServiceProvider = Provider<CachedApiService>((ref) {
  return CachedApiService(
    ref.watch(apiClientProvider),
    ref.watch(offlineCacheServiceProvider),
    ref,
  );
});
