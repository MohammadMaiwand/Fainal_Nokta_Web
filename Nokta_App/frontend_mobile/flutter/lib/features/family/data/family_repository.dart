import '../../../app/constants.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/cached_api_service.dart';

class FamilyRepository {
  FamilyRepository(this._api);

  final CachedApiService _api;

  Future<List<Map<String, dynamic>>> linkedStudents() async {
    final res = await _api.get(ApiPaths.studentsFamily);
    return ApiClient.unwrapList(res.data).cast<Map<String, dynamic>>();
  }
}
