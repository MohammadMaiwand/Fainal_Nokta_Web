import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

/// Hits the real backend. Start backend before running with:
/// `LIVE_BACKEND_TESTS=true cd backend && npm run dev`
void main() {
  final liveEnabled = Platform.environment['LIVE_BACKEND_TESTS'] == 'true';
  final apiPort = Platform.environment['LIVE_BACKEND_PORT'] ?? '8081';
  final healthUrl = 'http://127.0.0.1:$apiPort/health';
  final baseUrl = 'http://127.0.0.1:$apiPort/api';

  test('backend health is reachable', () async {
    if (!liveEnabled) return;
    final dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 8)));
    final response = await dio.get<dynamic>(healthUrl);
    expect(response.statusCode, 200);
  }, skip: liveEnabled ? false : 'Set LIVE_BACKEND_TESTS=true to run live API checks');

  test('QA student login returns token and user', () async {
    if (!liveEnabled) return;
    final dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {'Content-Type': 'application/json'},
      ),
    );
    final response = await dio.post<dynamic>(
      '/auth/login',
      data: {
        'email': 'student.qa@nokta.local',
        'password': 'Student@12345',
        'role': 'student',
      },
    );

    expect(response.statusCode, anyOf(200, 202));
    final body = response.data as Map<String, dynamic>;
    if (body['twoFactorRequired'] == true) {
      expect(body['twoFactorRequired'], isTrue);
      return;
    }
    expect(body['success'], isTrue);
    expect(body['token'], isNotEmpty);
    expect(body['user'], isA<Map>());
    final user = body['user'] as Map;
    expect(user['email'], 'student.qa@nokta.local');
  }, skip: liveEnabled ? false : 'Set LIVE_BACKEND_TESTS=true to run live API checks');
}
