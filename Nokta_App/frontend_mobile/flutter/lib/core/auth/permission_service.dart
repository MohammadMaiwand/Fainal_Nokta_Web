import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/models/user_profile.dart';
import '../permissions/mobile_permission_registry.dart';

/// Client-side permission hints — backend remains authoritative.
class PermissionService {
  PermissionService({MobilePermissionRegistry? registry})
      : _registry = registry ?? MobilePermissionRegistry();

  final MobilePermissionRegistry _registry;

  MobilePermissionRegistry get registry => _registry;

  bool canViewModule(UserProfile? user, String module) {
    if (user == null) return false;
    final route = _routeForModule(module);
    if (route != null) return _registry.canViewRoute(user, route);
    return false;
  }

  bool canAccessRoute(UserProfile? user, String routeName) {
    if (user == null) return false;
    final route = _parseRoute(routeName);
    if (route == null) return true;
    return _registry.canViewRoute(user, route);
  }

  List<String> dashboardQuickActions(UserProfile user) =>
      _registry.dashboardQuickActions(user);

  MobileRoute? _parseRoute(String name) {
    return switch (name) {
      'students' => MobileRoute.students,
      'teachers' => MobileRoute.teachers,
      'finance' => MobileRoute.finance,
      'reports' => MobileRoute.reports,
      'library' => MobileRoute.library,
      'payments' => MobileRoute.payments,
      'attendance' => MobileRoute.attendance,
      'attendance_mark' => MobileRoute.attendance,
      _ => _registry.routeFromQuickAction(name),
    };
  }

  MobileRoute? _routeForModule(String module) {
    return switch (module) {
      'timetable' => MobileRoute.timetable,
      'attendance' => MobileRoute.attendance,
      'payments' => MobileRoute.payments,
      'messages' => MobileRoute.messages,
      'results' => MobileRoute.results,
      'classes' => MobileRoute.classes,
      'subjects' => MobileRoute.subjects,
      'students' => MobileRoute.students,
      'teachers' => MobileRoute.teachers,
      'finance' => MobileRoute.finance,
      'reports' => MobileRoute.reports,
      'books' => MobileRoute.library,
      _ => null,
    };
  }
}

final permissionServiceProvider = Provider<PermissionService>(
  (ref) => PermissionService(),
);
