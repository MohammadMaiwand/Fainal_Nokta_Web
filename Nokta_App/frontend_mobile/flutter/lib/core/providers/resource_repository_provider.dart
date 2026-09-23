import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/shared/data/resource_repository.dart';
import '../api/cached_api_service.dart';

final resourceRepositoryProvider = Provider<ResourceRepository>(
  (ref) => ResourceRepository(ref.watch(cachedApiServiceProvider)),
);
