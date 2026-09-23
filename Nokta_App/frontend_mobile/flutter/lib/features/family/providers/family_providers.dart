import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/cached_api_service.dart';
import '../data/family_repository.dart';

final familyRepositoryProvider = Provider<FamilyRepository>(
  (ref) => FamilyRepository(ref.watch(cachedApiServiceProvider)),
);

/// Selected linked student `_id` for parent flows (attendance, payments, etc.).
final selectedStudentIdProvider = StateProvider<String?>((ref) => null);

final familyStudentsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  return ref.watch(familyRepositoryProvider).linkedStudents();
});
