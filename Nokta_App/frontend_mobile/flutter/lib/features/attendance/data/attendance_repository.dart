import '../../../app/constants.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/cached_api_service.dart';

class AttendanceRepository {
  AttendanceRepository(this._api);

  final CachedApiService _api;

  Future<Map<String, dynamic>> summary({String? studentId}) async {
    final res = await _api.get(
      ApiPaths.attendanceSummary,
      queryParameters: studentId != null ? {'studentId': studentId} : null,
    );
    final data = ApiClient.unwrapData(res.data);
    return data is Map<String, dynamic> ? data : {};
  }

  Future<Map<String, dynamic>> activeSessions() async {
    final res = await _api.get(ApiPaths.attendanceActiveSessions);
    final data = ApiClient.unwrapData(res.data);
    return data is Map<String, dynamic> ? data : {};
  }

  Future<List<Map<String, dynamic>>> list({Map<String, dynamic>? params}) async {
    final res = await _api.get(ApiPaths.attendance, queryParameters: params);
    return ApiClient.unwrapList(res.data).cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> mark({
    required String timetableId,
    String? studentId,
    String status = 'present',
    String? notes,
  }) async {
    final res = await _api.post(
      ApiPaths.attendanceMark,
      data: {
        'timetableId': timetableId,
        if (studentId != null) 'studentId': studentId,
        'status': status,
        if (notes != null) 'notes': notes,
      },
    );
    final data = ApiClient.unwrapData(res.data);
    return data is Map<String, dynamic> ? data : {};
  }
}
