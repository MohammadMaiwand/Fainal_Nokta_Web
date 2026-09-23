import '../../../app/constants.dart';
import '../../../core/api/api_client.dart';

class RegistrationRepository {
  RegistrationRepository(this._api);

  final ApiClient _api;

  Future<Map<String, dynamic>> fetchOptions({
    String? classId,
    String? subjectId,
  }) async {
    final response = await _api.get(
      ApiPaths.authRegisterOptions,
      queryParameters: {
        if (classId != null && classId.isNotEmpty) 'classId': classId,
        if (subjectId != null && subjectId.isNotEmpty) 'subjectId': subjectId,
      },
    );
    final data = ApiClient.unwrapData(response.data);
    return data is Map<String, dynamic> ? Map<String, dynamic>.from(data) : {};
  }

  Future<Map<String, dynamic>> quote({
    required String classId,
    required String subjectId,
    required String teacherId,
  }) async {
    final response = await _api.post(
      ApiPaths.authRegisterQuote,
      data: {
        'classId': classId,
        'subjectId': subjectId,
        'teacherId': teacherId,
      },
    );
    final data = ApiClient.unwrapData(response.data);
    return data is Map<String, dynamic> ? Map<String, dynamic>.from(data) : {};
  }

  Future<Map<String, dynamic>> createCheckout({
    required String email,
    required String classId,
    required String subjectId,
    required String teacherId,
  }) async {
    final response = await _api.post(
      ApiPaths.authRegisterCheckout,
      data: {
        'email': email.trim(),
        'classId': classId,
        'subjectId': subjectId,
        'teacherId': teacherId,
      },
    );
    final data = ApiClient.unwrapData(response.data);
    return data is Map<String, dynamic> ? Map<String, dynamic>.from(data) : {};
  }

  Future<Map<String, dynamic>> confirmPayment({
    required String email,
    required String classId,
    required String subjectId,
    required String teacherId,
    required String checkoutToken,
    required String paymentReference,
    String paymentMethod = 'mobile_money',
  }) async {
    final response = await _api.post(
      ApiPaths.authRegisterConfirmPayment,
      data: {
        'email': email.trim(),
        'classId': classId,
        'subjectId': subjectId,
        'teacherId': teacherId,
        'checkoutToken': checkoutToken,
        'paymentReference': paymentReference.trim(),
        'paymentMethod': paymentMethod,
      },
    );
    final data = ApiClient.unwrapData(response.data);
    return data is Map<String, dynamic> ? Map<String, dynamic>.from(data) : {};
  }

  Future<Map<String, dynamic>> registerStudent(Map<String, dynamic> payload) async {
    final response = await _api.post(ApiPaths.authRegisterStudent, data: payload);
    final data = ApiClient.unwrapData(response.data);
    return data is Map<String, dynamic> ? Map<String, dynamic>.from(data) : {};
  }
}
