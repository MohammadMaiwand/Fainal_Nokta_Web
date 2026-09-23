import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http_mock_adapter/http_mock_adapter.dart';
import 'package:nokta_academy/app/constants.dart';
import 'package:nokta_academy/app/env_config.dart';
import 'package:nokta_academy/core/api/api_client.dart';
import 'package:nokta_academy/core/api/api_exception.dart';
import 'package:nokta_academy/core/auth/token_storage.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ApiClient', () {
    late Dio dio;
    late DioAdapter adapter;
    late ApiClient client;

    setUp(() {
      dio = Dio(BaseOptions(baseUrl: EnvConfig.apiBaseUrl));
      adapter = DioAdapter(dio: dio);
      dio.httpClientAdapter = adapter;
      client = ApiClient(
        tokenStorage: TokenStorage(),
        dio: dio,
        accessTokenReader: () async => null,
      );
    });

    test('unwrapData reads nested data field', () {
      expect(
        ApiClient.unwrapData({'success': true, 'data': {'id': '1'}}),
        {'id': '1'},
      );
    });

    test('GET maps 403 to permission exception', () async {
      adapter.onGet(
        ApiPaths.authProfile,
        (server) => server.reply(403, {'message': 'Forbidden'}),
      );

      expect(
        () => client.get(ApiPaths.authProfile),
        throwsA(
          predicate<ApiException>((e) => e.isPermissionDenied && e.statusCode == 403),
        ),
      );
    });

    test('GET retries once on connection timeout', () async {
      var calls = 0;
      final retryDio = Dio(BaseOptions(baseUrl: EnvConfig.apiBaseUrl));
      retryDio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            calls++;
            if (calls == 1) {
              handler.reject(
                DioException(
                  requestOptions: options,
                  type: DioExceptionType.connectionTimeout,
                ),
              );
              return;
            }
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: {'ok': true},
              ),
            );
          },
        ),
      );
      final retryClient = ApiClient(
        tokenStorage: TokenStorage(),
        dio: retryDio,
        accessTokenReader: () async => null,
      );

      final response = await retryClient.get('/health-retry-test');
      expect(response.statusCode, 200);
      expect(calls, 2);
    });
  });
}
