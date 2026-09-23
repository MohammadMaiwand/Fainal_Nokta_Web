import '../../../app/constants.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/cached_api_service.dart';
import '../../auth/models/user_profile.dart';

class PaymentsRepository {
  PaymentsRepository(this._api);

  final CachedApiService _api;

  Future<List<Map<String, dynamic>>> list({
    UserProfile? user,
    Map<String, dynamic>? params,
  }) async {
    final isStudentOnly = user != null &&
        user.isRole(AppRoles.student) &&
        !user.isRole(AppRoles.familyStudent);
    final path = isStudentOnly
        ? ApiPaths.studentsMePayments
        : ApiPaths.payments;
    final res = await _api.get(
      path,
      queryParameters: {'limit': 100, ...?params},
    );
    return ApiClient.unwrapList(res.data).cast<Map<String, dynamic>>();
  }
}
