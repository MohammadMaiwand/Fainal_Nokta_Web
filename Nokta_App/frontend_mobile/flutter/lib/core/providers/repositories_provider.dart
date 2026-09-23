import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/attendance/data/attendance_repository.dart';
import '../../features/auth/data/registration_repository.dart';
import '../../features/dashboard/data/dashboard_repository.dart';
import '../../features/messages/data/messages_repository.dart';
import '../../features/payments/data/payments_repository.dart';
import '../../features/profile/data/profile_repository.dart';
import '../../features/public_home/data/public_repository.dart';
import '../../features/timetable/data/timetable_repository.dart';
import '../api/api_client.dart';
import '../api/cached_api_service.dart';

final publicRepositoryProvider = Provider<PublicRepository>(
  (ref) => PublicRepository(ref.watch(apiClientProvider)),
);

final registrationRepositoryProvider = Provider<RegistrationRepository>(
  (ref) => RegistrationRepository(ref.watch(apiClientProvider)),
);

final dashboardRepositoryProvider = Provider<DashboardRepository>(
  (ref) => DashboardRepository(
    ref.watch(cachedApiServiceProvider),
    ref.watch(apiClientProvider),
  ),
);

final messagesRepositoryProvider = Provider<MessagesRepository>(
  (ref) => MessagesRepository(ref.watch(cachedApiServiceProvider)),
);

final attendanceRepositoryProvider = Provider<AttendanceRepository>(
  (ref) => AttendanceRepository(ref.watch(cachedApiServiceProvider)),
);

final timetableRepositoryProvider = Provider<TimetableRepository>(
  (ref) => TimetableRepository(ref.watch(cachedApiServiceProvider)),
);

final paymentsRepositoryProvider = Provider<PaymentsRepository>(
  (ref) => PaymentsRepository(ref.watch(cachedApiServiceProvider)),
);

final profileRepositoryProvider = Provider<ProfileRepository>(
  (ref) => ProfileRepository(ref.watch(apiClientProvider)),
);
