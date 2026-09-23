import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../auth/permission_service.dart';
import '../permissions/mobile_permission_registry.dart';
import 'app_error_views.dart';

class RouteGuard extends ConsumerWidget {
  const RouteGuard({
    super.key,
    required this.route,
    required this.child,
  });

  final MobileRoute route;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final registry = ref.watch(permissionServiceProvider).registry;
    if (user == null) {
      return const AppErrorView(type: AppErrorType.sessionExpired);
    }
    if (!registry.canViewRoute(user, route)) {
      return const PermissionDeniedScreen();
    }
    return child;
  }
}
