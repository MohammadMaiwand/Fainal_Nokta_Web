import '../../../app/constants.dart';
import '../../../core/api/api_client.dart';
import '../../../core/utils/formatters.dart';

class PublicRepository {
  PublicRepository(this._api);

  final ApiClient _api;

  Future<List<Map<String, dynamic>>> fetchClasses({String lang = 'en'}) async {
    final response = await _api.get(
      ApiPaths.classesPublicHome,
      queryParameters: {'limit': 50, 'lang': lang},
    );
    return ApiClient.unwrapList(response.data).cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> fetchCourses({String lang = 'en'}) async {
    final response = await _api.get(
      ApiPaths.coursesPublicHome,
      queryParameters: {'limit': 50, 'lang': lang},
    );
    return ApiClient.unwrapList(response.data).cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> fetchAnnouncements() async {
    final response = await _api.get(
      ApiPaths.notificationsPublic,
      queryParameters: {'limit': 4},
    );
    return ApiClient.unwrapList(response.data).cast<Map<String, dynamic>>();
  }

  Future<void> sendContact({
    required String name,
    required String message,
    String? email,
  }) async {
    await _api.post(
      ApiPaths.messagesPublicContact,
      data: {
        'name': name,
        'message': message,
        if (email != null && email.isNotEmpty) 'email': email,
      },
    );
  }

  static Map<String, dynamic> normalizeOffering(
    Map<String, dynamic> raw, {
    required String language,
    String catalogType = 'class',
  }) {
    return {
      ...raw,
      'catalogType': catalogType,
      'titleText': readLocalizedText(
        raw['titleText'] ?? raw['className'] ?? raw['title'],
        language: language,
      ),
      'descriptionText': readLocalizedText(
        raw['shortDescription'] ?? raw['descriptionText'] ?? raw['description'],
        language: language,
      ),
    };
  }
}
