import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_provider.dart';
import '../../../core/providers/repositories_provider.dart';

final dashboardDataProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final user = ref.watch(authProvider).user;
  if (user == null) return {};
  return ref.read(dashboardRepositoryProvider).loadForUser(user);
});
