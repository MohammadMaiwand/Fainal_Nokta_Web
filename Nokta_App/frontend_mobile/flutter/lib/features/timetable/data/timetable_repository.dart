import '../../../app/constants.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/cached_api_service.dart';
import '../../auth/models/user_profile.dart';

class TimetableRepository {
  TimetableRepository(this._api);

  final CachedApiService _api;

  Future<List<Map<String, dynamic>>> week({
    Map<String, dynamic>? params,
    UserProfile? user,
  }) async {
    final isStudentOnly = user != null &&
        user.isRole(AppRoles.student) &&
        !user.isRole(AppRoles.familyStudent);
    final path = isStudentOnly
        ? ApiPaths.studentsMeTimetable
        : ApiPaths.timetableWeek;
    final res = await _api.get(path, queryParameters: params);
    final data = ApiClient.unwrapData(res.data);
    if (data is Map && data['items'] is List) {
      return (data['items'] as List).cast<Map<String, dynamic>>();
    }
    return ApiClient.unwrapList(res.data).cast<Map<String, dynamic>>();
  }
}
