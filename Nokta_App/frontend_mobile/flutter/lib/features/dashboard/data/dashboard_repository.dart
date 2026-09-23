import '../../../app/constants.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/cached_api_service.dart';
import '../../auth/models/user_profile.dart';

class DashboardRepository {
  DashboardRepository(this._api, this._client);

  final CachedApiService _api;
  final ApiClient _client;

  Future<Map<String, dynamic>> fetchSummary() async {
    final response = await _api.get(ApiPaths.dashboardSummary);
    final data = ApiClient.unwrapData(response.data);
    return data is Map<String, dynamic> ? Map<String, dynamic>.from(data) : {};
  }

  Future<Map<String, dynamic>> fetchStudentDashboard() async {
    final response = await _api.get(ApiPaths.studentsMeDashboard);
    final data = ApiClient.unwrapData(response.data);
    return data is Map<String, dynamic> ? Map<String, dynamic>.from(data) : {};
  }

  Future<Map<String, dynamic>> fetchTeacherEarnings() async {
    final response = await _client.get(ApiPaths.financeMeEarnings);
    final data = ApiClient.unwrapData(response.data);
    return data is Map<String, dynamic> ? Map<String, dynamic>.from(data) : {};
  }

  Future<Map<String, dynamic>> loadForUser(UserProfile user) async {
    if (user.isRole(AppRoles.student) || user.isRole(AppRoles.familyStudent)) {
      final studentData = await fetchStudentDashboard();
      return _normalizeStudentDashboard(studentData);
    }

    final summary = await fetchSummary();

    if (user.isRole(AppRoles.teacher)) {
      try {
        final earnings = await fetchTeacherEarnings();
        final overview = earnings['overview'];
        if (overview is Map<String, dynamic>) {
          summary['teacherPayable'] = overview['totalSalaryPayable'];
          summary['teacherPaid'] = overview['paidSalaryAmount'];
          summary['teacherUnpaid'] = overview['unpaidSalaryAmount'];
          summary['teacherCommission'] = overview['commissionEarned'];
        }
        final salaryRecords = earnings['salaryRecords'];
        if (salaryRecords is List) {
          double taxTotal = 0;
          for (final row in salaryRecords) {
            if (row is Map<String, dynamic>) {
              taxTotal += (row['taxAmount'] as num?)?.toDouble() ?? 0;
            }
          }
          summary['teacherTaxTotal'] = taxTotal;
        }
      } catch (_) {
        summary['teacherPayable'] = 0;
        summary['teacherUnpaid'] = 0;
        summary['teacherPaid'] = 0;
        summary['teacherTaxTotal'] = 0;
      }
    }

    return summary;
  }

  Map<String, dynamic> _normalizeStudentDashboard(Map<String, dynamic> raw) {
    final profile = raw['profile'] is Map<String, dynamic>
        ? Map<String, dynamic>.from(raw['profile'] as Map)
        : <String, dynamic>{};
    final payments = (raw['payments'] as List<dynamic>? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
    final results = (raw['results'] as List<dynamic>? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    final paidTotal = payments.fold<double>(
      0,
      (sum, payment) => sum + ((payment['amount'] as num?)?.toDouble() ?? 0),
    );

    return {
      ...raw,
      'profile': profile,
      'payments': payments,
      'results': results,
      'paymentsCount': payments.length,
      'resultsCount': results.length,
      'paidTotal': paidTotal,
      'remainingBalance': (profile['remainingBalance'] as num?) ?? 0,
      'feeAmount': (profile['feeAmount'] as num?) ?? 0,
      'attendanceCount': raw['attendanceCount'] ?? 0,
    };
  }
}
