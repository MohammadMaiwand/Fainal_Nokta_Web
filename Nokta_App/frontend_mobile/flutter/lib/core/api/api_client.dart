import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/constants.dart';
import '../../app/env_config.dart';
import '../config/release_config.dart';
import '../config/safe_logger.dart';
import '../auth/token_storage.dart';
import 'api_exception.dart';

typedef TokenRefresher = Future<String?> Function(String refreshToken);

class ApiClient {
  ApiClient({
    required TokenStorage tokenStorage,
    Dio? dio,
    TokenRefresher? onRefreshToken,
    Future<String?> Function()? accessTokenReader,
  })  : _tokenStorage = tokenStorage,
        _onRefreshToken = onRefreshToken,
        _accessTokenReader = accessTokenReader,
        _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: EnvConfig.apiBaseUrl,
                connectTimeout: ReleaseConfig.connectTimeout,
                receiveTimeout: ReleaseConfig.receiveTimeout,
                sendTimeout: ReleaseConfig.sendTimeout,
                headers: {'Content-Type': 'application/json'},
              ),
            ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final reader = _accessTokenReader;
          final token = reader != null
              ? await reader()
              : await _tokenStorage.readAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          options.headers['x-device-id'] ??= 'nokta-flutter-mobile';
          options.headers['x-device-name'] ??= 'Nokta Flutter App';
          handler.next(options);
        },
        onError: (error, handler) async {
          final status = error.response?.statusCode;
          if (status == 401 && _shouldAttemptRefresh(error.requestOptions)) {
            final refreshed = await _refreshAccessToken();
            if (refreshed != null) {
              final retry = error.requestOptions;
              retry.headers['Authorization'] = 'Bearer $refreshed';
              try {
                final response = await _dio.fetch(retry);
                return handler.resolve(response);
              } catch (retryError) {
                if (retryError is DioException) {
                  return handler.next(retryError);
                }
              }
            }
          }
          handler.next(error);
        },
      ),
    );

    if (ReleaseConfig.enableApiLogging) {
      _dio.interceptors.add(
        LogInterceptor(
          requestBody: !ReleaseConfig.isProduction,
          responseBody: false,
          logPrint: (obj) => SafeLogger.api(obj.toString()),
        ),
      );
    }
  }

  final Dio _dio;
  final TokenStorage _tokenStorage;
  final TokenRefresher? _onRefreshToken;
  final Future<String?> Function()? _accessTokenReader;
  Completer<String?>? _refreshCompleter;

  Dio get dio => _dio;

  bool _shouldAttemptRefresh(RequestOptions options) {
    return !options.path.contains(ApiPaths.authLogin) &&
        !options.path.contains(ApiPaths.authRefresh);
  }

  Future<String?> _refreshAccessToken() async {
    if (_refreshCompleter != null) {
      return _refreshCompleter!.future;
    }
    _refreshCompleter = Completer<String?>();
    try {
      final refreshToken = await _tokenStorage.readRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) {
        _refreshCompleter!.complete(null);
        return null;
      }
      final refresher = _onRefreshToken;
      if (refresher == null) {
        await _tokenStorage.clearAll();
        _refreshCompleter!.complete(null);
        return null;
      }
      final next = await refresher(refreshToken);
      if (next == null || next.isEmpty) {
        await _tokenStorage.clearAll();
      }
      _refreshCompleter!.complete(next);
      return next;
    } catch (_) {
      await _tokenStorage.clearAll();
      _refreshCompleter!.complete(null);
      return null;
    } finally {
      _refreshCompleter = null;
    }
  }

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    bool allowRetry = true,
  }) async {
    return _request<T>(
      () => _dio.get<T>(path, queryParameters: queryParameters),
      allowRetry: allowRetry,
    );
  }

  Future<Response<T>> post<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    return _request<T>(
      () => _dio.post<T>(path, data: data, queryParameters: queryParameters),
      allowRetry: false,
    );
  }

  Future<Response<T>> put<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    return _request<T>(
      () => _dio.put<T>(path, data: data, queryParameters: queryParameters),
      allowRetry: false,
    );
  }

  Future<Response<T>> patch<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    return _request<T>(
      () => _dio.patch<T>(path, data: data, queryParameters: queryParameters),
      allowRetry: false,
    );
  }

  Future<Response<T>> delete<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    return _request<T>(
      () => _dio.delete<T>(path, data: data, queryParameters: queryParameters),
      allowRetry: false,
    );
  }

  Future<Response<T>> _request<T>(
    Future<Response<T>> Function() call, {
    required bool allowRetry,
  }) async {
    var attempts = 0;
    while (true) {
      try {
        return await call();
      } on DioException catch (error) {
        attempts++;
        final canRetry = allowRetry &&
            attempts < ReleaseConfig.maxGetRetries &&
            _isRetryable(error) &&
            error.requestOptions.method.toUpperCase() == 'GET';
        if (canRetry) {
          await Future<void>.delayed(const Duration(milliseconds: 400));
          continue;
        }
        throw _mapException(error);
      }
    }
  }

  bool _isRetryable(DioException error) {
    return error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError;
  }

  ApiException _mapException(DioException error) {
    final status = error.response?.statusCode;
    final data = error.response?.data;
    var message = 'Request failed';
    if (data is Map) {
      final raw = data['message'] ?? data['error'];
      if (raw is String && raw.isNotEmpty) message = raw;
    } else if (error.message != null) {
      message = error.message!;
    }

    final isTimeout = error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout;

    return ApiException(
      message: isTimeout ? 'Request timed out. Please try again.' : message,
      statusCode: status,
      isNetworkError: error.type == DioExceptionType.connectionError || isTimeout,
      isPermissionDenied: status == 403,
      isUnauthorized: status == 401,
      isTimeout: isTimeout,
    );
  }

  static dynamic unwrapData(dynamic payload) {
    if (payload is Map<String, dynamic>) {
      if (payload.containsKey('data')) return payload['data'];
    }
    return payload;
  }

  static List<dynamic> unwrapList(dynamic payload) {
    final data = unwrapData(payload);
    if (data is List) return data;
    if (data is Map) {
      for (final key in ['items', 'docs', 'results', 'data']) {
        final value = data[key];
        if (value is List) return value;
      }
    }
    return const [];
  }
}

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(tokenStorageProvider);
  return ApiClient(
    tokenStorage: storage,
    onRefreshToken: (refreshToken) async {
      final client = Dio(BaseOptions(baseUrl: EnvConfig.apiBaseUrl));
      final response = await client.post(
        ApiPaths.authRefresh,
        data: {'refreshToken': refreshToken},
      );
      final body = response.data;
      final data = ApiClient.unwrapData(body) as Map<String, dynamic>? ?? {};
      final tokens = data['tokens'] as Map<String, dynamic>? ?? data;
      final access = tokens['accessToken'] as String?;
      final refresh = tokens['refreshToken'] as String? ?? refreshToken;
      if (access == null) return null;
      final remember = await storage.readRememberMe();
      await storage.saveTokens(
        accessToken: access,
        refreshToken: refresh,
        rememberMe: remember,
      );
      return access;
    },
  );
});
