import '../../../core/api/api_client.dart';
import '../../../core/api/cached_api_service.dart';

class ResourceRepository {
  ResourceRepository(this._api);

  final CachedApiService _api;

  Future<List<Map<String, dynamic>>> list(
    String path, {
    Map<String, dynamic>? params,
  }) async {
    final response = await _api.get(path, queryParameters: params);
    return ApiClient.unwrapList(response.data).cast<Map<String, dynamic>>();
  }
}
