import '../../../app/constants.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/cached_api_service.dart';

class MessagesRepository {
  MessagesRepository(this._api);

  final CachedApiService _api;

  Future<List<Map<String, dynamic>>> inbox({Map<String, dynamic>? params}) async {
    final response = await _api.get(ApiPaths.messagesInbox, queryParameters: params);
    return ApiClient.unwrapList(response.data).cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> sent({Map<String, dynamic>? params}) async {
    final response = await _api.get(ApiPaths.messagesSent, queryParameters: params);
    return ApiClient.unwrapList(response.data).cast<Map<String, dynamic>>();
  }

  Future<int> unreadCount() async {
    final response = await _api.get(ApiPaths.messagesUnreadCount);
    final data = ApiClient.unwrapData(response.data) as Map<String, dynamic>? ?? {};
    return (data['unreadCount'] as num?)?.toInt() ?? 0;
  }

  Future<Map<String, dynamic>> getById(String id) async {
    final response = await _api.get('/messages/$id');
    final data = ApiClient.unwrapData(response.data);
    return data is Map<String, dynamic> ? data : {};
  }

  Future<void> reply(String id, String message) async {
    await _api.post('/messages/$id/reply', data: {'message': message});
  }

  Future<void> markRead(String id) async {
    await _api.patch('/messages/$id/read');
  }

  Future<void> create(Map<String, dynamic> payload) async {
    await _api.post('/messages', data: payload);
  }
}
