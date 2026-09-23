import '../../../app/constants.dart';
import '../../../core/api/api_client.dart';

class ProfileRepository {
  ProfileRepository(this._api);

  final ApiClient _api;

  Future<Map<String, dynamic>> fetchProfile() async {
    final response = await _api.get(ApiPaths.authProfile);
    final data = ApiClient.unwrapData(response.data);
    return data is Map<String, dynamic> ? data : {};
  }

  Future<Map<String, dynamic>> updateProfile({
    String? phone,
    String? profileImage,
    String? name,
  }) async {
    final payload = <String, dynamic>{};
    if (phone != null) payload['phone'] = phone;
    if (profileImage != null) payload['profileImage'] = profileImage;
    if (name != null) payload['name'] = name;
    final response = await _api.put(ApiPaths.authProfile, data: payload);
    final data = ApiClient.unwrapData(response.data);
    return data is Map<String, dynamic> ? data : {};
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _api.post(
      '/auth/profile/change-password',
      data: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      },
    );
  }
}
