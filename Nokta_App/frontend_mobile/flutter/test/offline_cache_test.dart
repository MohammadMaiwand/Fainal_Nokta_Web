import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:nokta_academy/core/cache/offline_cache_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('cache stores and returns GET payload', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final cache = OfflineCacheService(prefs);
    const key = 'nokta_cache_v2:/test';
    await cache.put(key, {'hello': 'world'});
    final data = await cache.get(key);
    expect(data, {'hello': 'world'});
  });

  test('shouldCache rejects 401 and non-GET', () {
    expect(OfflineCacheService.shouldCache(200, 'GET'), isTrue);
    expect(OfflineCacheService.shouldCache(401, 'GET'), isFalse);
    expect(OfflineCacheService.shouldCache(200, 'POST'), isFalse);
  });
}
