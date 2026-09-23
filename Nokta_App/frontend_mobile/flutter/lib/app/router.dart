import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/auth/permission_service.dart';
import '../core/permissions/mobile_permission_registry.dart';
import '../core/widgets/app_error_views.dart';
import '../core/widgets/route_guard.dart';
import '../features/attendance/presentation/attendance_screen.dart';
import '../features/audit/presentation/audit_screen.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/auth/presentation/register_screen.dart';
import '../features/auth/presentation/two_factor_screen.dart';
import '../features/dev/presentation/dev_readiness_screen.dart';
import '../features/family/presentation/family_home_screen.dart';
import '../features/family/presentation/student_detail_screen.dart';
import '../features/finance/presentation/expenses_screen.dart';
import '../features/finance/presentation/salaries_screen.dart';
import '../features/finance/presentation/teacher_earnings_screen.dart';
import '../features/messages/presentation/compose_message_screen.dart';
import '../features/public_home/presentation/catalog_detail_screen.dart';
import '../features/results/presentation/result_detail_screen.dart';
import '../features/results/presentation/results_screen.dart';
import '../features/student/presentation/student_enrollment_screen.dart';
import '../app/constants.dart';
import '../features/auth/providers/auth_provider.dart';
import '../features/dashboard/presentation/dashboard_screen.dart';
import '../features/messages/presentation/message_detail_screen.dart';
import '../features/messages/presentation/messages_screen.dart';
import '../features/payments/presentation/payments_screen.dart';
import '../features/profile/presentation/profile_screen.dart';
import '../features/public_home/presentation/public_home_screen.dart';
import '../features/settings/presentation/about_screen.dart';
import '../features/settings/presentation/settings_screen.dart';
import '../features/shared/presentation/resource_list_screen.dart';
import '../features/timetable/presentation/timetable_screen.dart';
import 'presentation/app_shell.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);
  final registry = ref.watch(permissionServiceProvider).registry;

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/',
    refreshListenable: _RouterRefresh(ref),
    redirect: (context, state) {
      if (auth.status == AuthStatus.unknown) return null;
      if (auth.status != AuthStatus.authenticated && state.matchedLocation.startsWith('/app')) {
        return '/login';
      }
      if (auth.status == AuthStatus.authenticated &&
          (state.matchedLocation == '/login' || state.matchedLocation == '/')) {
        return '/app/dashboard';
      }
      final user = auth.user;
      if (user != null && state.matchedLocation.startsWith('/app/')) {
        final route = _routeFromPath(state.matchedLocation);
        if (route != null && !registry.canViewRoute(user, route)) {
          return '/app/forbidden';
        }
      }
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, __) => const PublicHomeScreen()),
      GoRoute(
        path: '/catalog/detail',
        builder: (_, state) => CatalogDetailScreen(
          offering: (state.extra as Map<String, dynamic>?) ?? {},
        ),
      ),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(
        path: '/register',
        builder: (_, state) => RegisterScreen(
          initialSelection: (state.extra as Map<String, dynamic>?) ?? {},
        ),
      ),
      GoRoute(
        path: '/login/2fa',
        builder: (_, state) => TwoFactorScreen(
          email: state.uri.queryParameters['email'] ?? '',
          rememberMe: state.uri.queryParameters['remember'] != 'false',
        ),
      ),
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/app/dashboard', builder: (_, __) => const DashboardScreen()),
          GoRoute(path: '/app/messages', builder: (_, __) => const MessagesScreen()),
          GoRoute(path: '/app/messages/compose', builder: (_, __) => const ComposeMessageScreen()),
          GoRoute(
            path: '/app/messages/:id',
            builder: (_, state) => MessageDetailScreen(id: state.pathParameters['id']!),
          ),
          GoRoute(path: '/app/my-enrollment', builder: (_, __) => const StudentEnrollmentScreen()),
          GoRoute(path: '/app/profile', builder: (_, __) => const ProfileScreen()),
          GoRoute(path: '/app/settings', builder: (_, __) => const SettingsScreen()),
          GoRoute(path: '/app/about', builder: (_, __) => const AboutScreen()),
          GoRoute(path: '/app/timetable', builder: (_, __) => const TimetableScreen()),
          GoRoute(path: '/app/attendance', builder: (_, __) => const AttendanceScreen()),
          GoRoute(path: '/app/payments', builder: (_, __) => const PaymentsScreen()),
          GoRoute(
            path: '/app/forbidden',
            builder: (_, __) => Scaffold(
              appBar: AppBar(),
              body: const AppErrorView(type: AppErrorType.permission),
            ),
          ),
          GoRoute(
            path: '/app/notifications',
            builder: (_, __) => const RouteGuard(
              route: MobileRoute.notifications,
              child: ResourceListScreen(route: MobileRoute.notifications),
            ),
          ),
          GoRoute(
            path: '/app/results',
            builder: (_, __) => const RouteGuard(
              route: MobileRoute.results,
              child: ResultsScreen(),
            ),
          ),
          GoRoute(
            path: '/app/results/:id',
            builder: (_, state) => ResultDetailScreen(resultId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: '/app/classes',
            builder: (_, __) => const RouteGuard(
              route: MobileRoute.classes,
              child: ResourceListScreen(route: MobileRoute.classes),
            ),
          ),
          GoRoute(
            path: '/app/subjects',
            builder: (_, __) => const RouteGuard(
              route: MobileRoute.subjects,
              child: ResourceListScreen(route: MobileRoute.subjects),
            ),
          ),
          GoRoute(
            path: '/app/students',
            builder: (_, __) => const RouteGuard(
              route: MobileRoute.students,
              child: ResourceListScreen(route: MobileRoute.students),
            ),
          ),
          GoRoute(
            path: '/app/teachers',
            builder: (_, __) => const RouteGuard(
              route: MobileRoute.teachers,
              child: ResourceListScreen(route: MobileRoute.teachers),
            ),
          ),
          GoRoute(
            path: '/app/finance',
            builder: (_, __) => RouteGuard(
              route: MobileRoute.finance,
              child: _FinanceEntry(),
            ),
          ),
          GoRoute(
            path: '/app/reports',
            builder: (_, __) => const RouteGuard(
              route: MobileRoute.reports,
              child: ResourceListScreen(route: MobileRoute.reports),
            ),
          ),
          GoRoute(
            path: '/app/library',
            builder: (_, __) => const RouteGuard(
              route: MobileRoute.library,
              child: ResourceListScreen(route: MobileRoute.library),
            ),
          ),
          GoRoute(
            path: '/app/family',
            builder: (_, __) => const RouteGuard(
              route: MobileRoute.family,
              child: FamilyHomeScreen(),
            ),
          ),
          GoRoute(
            path: '/app/family/:studentId',
            builder: (_, state) => RouteGuard(
              route: MobileRoute.family,
              child: StudentDetailScreen(studentId: state.pathParameters['studentId']!),
            ),
          ),
          GoRoute(
            path: '/app/expenses',
            builder: (_, __) => const RouteGuard(
              route: MobileRoute.expenses,
              child: ExpensesScreen(),
            ),
          ),
          GoRoute(
            path: '/app/salaries',
            builder: (_, __) => const RouteGuard(
              route: MobileRoute.salaries,
              child: SalariesScreen(),
            ),
          ),
          GoRoute(
            path: '/app/audit',
            builder: (_, __) => const RouteGuard(
              route: MobileRoute.audit,
              child: AuditScreen(),
            ),
          ),
          GoRoute(
            path: '/app/dev/readiness',
            builder: (_, __) => const DevReadinessScreen(),
          ),
        ],
      ),
    ],
  );
});

class _FinanceEntry extends ConsumerWidget {
  const _FinanceEntry();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    if (user != null && user.isRole(AppRoles.teacher)) {
      return const TeacherEarningsScreen();
    }
    return const ResourceListScreen(route: MobileRoute.finance);
  }
}

MobileRoute? _routeFromPath(String path) {
  if (path.contains('/finance')) return MobileRoute.finance;
  if (path.contains('/reports')) return MobileRoute.reports;
  if (path.contains('/students')) return MobileRoute.students;
  if (path.contains('/teachers')) return MobileRoute.teachers;
  if (path.contains('/payments')) return MobileRoute.payments;
  if (path.contains('/attendance')) return MobileRoute.attendance;
  if (path.contains('/timetable')) return MobileRoute.timetable;
  if (path.contains('/my-enrollment')) return MobileRoute.classes;
  if (path.contains('/messages')) return MobileRoute.messages;
  if (path.contains('/notifications')) return MobileRoute.notifications;
  if (path.contains('/results')) return MobileRoute.results;
  if (path.contains('/classes')) return MobileRoute.classes;
  if (path.contains('/subjects')) return MobileRoute.subjects;
  if (path.contains('/library')) return MobileRoute.library;
  if (path.contains('/family')) return MobileRoute.family;
  if (path.contains('/expenses')) return MobileRoute.expenses;
  if (path.contains('/salaries')) return MobileRoute.salaries;
  if (path.contains('/audit')) return MobileRoute.audit;
  return null;
}

class _RouterRefresh extends ChangeNotifier {
  _RouterRefresh(this.ref) {
    ref.listen<AuthState>(authProvider, (_, __) => notifyListeners());
  }
  final Ref ref;
}
