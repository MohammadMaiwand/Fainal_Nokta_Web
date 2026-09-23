import 'package:flutter/material.dart';

import 'constants.dart';
import '../core/design/app_icons.dart';
import '../core/permissions/mobile_permission_registry.dart';
import '../features/auth/models/user_profile.dart';

class ShellNavItem {
  const ShellNavItem({
    required this.path,
    required this.labelKey,
    required this.icon,
    required this.activeIcon,
  });

  final String path;
  final String labelKey;
  final IconData icon;
  final IconData activeIcon;
}

/// Role-aware bottom navigation (daily-use routes only).
List<ShellNavItem> shellNavItemsFor(UserProfile user, MobilePermissionRegistry registry) {
  final role = user.effectiveRole;

  if (role == AppRoles.parent || role == AppRoles.familyStudent) {
    return const [
      ShellNavItem(
        path: '/app/dashboard',
        labelKey: 'navDashboard',
        icon: AppIcons.dashboard,
        activeIcon: AppIcons.dashboardActive,
      ),
      ShellNavItem(
        path: '/app/family',
        labelKey: 'navFamily',
        icon: AppIcons.family,
        activeIcon: Icons.family_restroom,
      ),
      ShellNavItem(
        path: '/app/messages',
        labelKey: 'navMessages',
        icon: AppIcons.messages,
        activeIcon: AppIcons.messagesActive,
      ),
      ShellNavItem(
        path: '/app/profile',
        labelKey: 'navProfile',
        icon: Icons.person_outline,
        activeIcon: Icons.person,
      ),
    ];
  }

  if (user.isRole(AppRoles.student)) {
    return [
      const ShellNavItem(
        path: '/app/dashboard',
        labelKey: 'navDashboard',
        icon: AppIcons.dashboard,
        activeIcon: AppIcons.dashboardActive,
      ),
      const ShellNavItem(
        path: '/app/my-enrollment',
        labelKey: 'navClasses',
        icon: Icons.class_outlined,
        activeIcon: Icons.class_,
      ),
      if (registry.canViewRoute(user, MobileRoute.messages))
        const ShellNavItem(
          path: '/app/messages',
          labelKey: 'navMessages',
          icon: AppIcons.messages,
          activeIcon: AppIcons.messagesActive,
        ),
      const ShellNavItem(
        path: '/app/profile',
        labelKey: 'navProfile',
        icon: Icons.person_outline,
        activeIcon: Icons.person,
      ),
    ];
  }

  if (role == AppRoles.teacher) {
    return [
      const ShellNavItem(
        path: '/app/dashboard',
        labelKey: 'navDashboard',
        icon: AppIcons.dashboard,
        activeIcon: AppIcons.dashboardActive,
      ),
      if (registry.canViewRoute(user, MobileRoute.results))
        const ShellNavItem(
          path: '/app/results',
          labelKey: 'navResults',
          icon: Icons.assignment_outlined,
          activeIcon: Icons.assignment,
        ),
      if (registry.canViewRoute(user, MobileRoute.finance))
        const ShellNavItem(
          path: '/app/finance',
          labelKey: 'navFinance',
          icon: Icons.payments_outlined,
          activeIcon: Icons.payments,
        ),
      if (registry.canViewRoute(user, MobileRoute.messages))
        const ShellNavItem(
          path: '/app/messages',
          labelKey: 'navMessages',
          icon: AppIcons.messages,
          activeIcon: AppIcons.messagesActive,
        ),
      const ShellNavItem(
        path: '/app/profile',
        labelKey: 'navProfile',
        icon: Icons.person_outline,
        activeIcon: Icons.person,
      ),
    ];
  }

  if (role == AppRoles.accountant) {
    return [
      const ShellNavItem(
        path: '/app/dashboard',
        labelKey: 'navDashboard',
        icon: AppIcons.dashboard,
        activeIcon: AppIcons.dashboardActive,
      ),
      if (registry.canViewRoute(user, MobileRoute.payments))
        const ShellNavItem(
          path: '/app/payments',
          labelKey: 'navPayments',
          icon: Icons.payments_outlined,
          activeIcon: Icons.payments,
        ),
      if (registry.canViewRoute(user, MobileRoute.expenses))
        const ShellNavItem(
          path: '/app/expenses',
          labelKey: 'navExpenses',
          icon: Icons.receipt_long_outlined,
          activeIcon: Icons.receipt_long,
        ),
      const ShellNavItem(
        path: '/app/profile',
        labelKey: 'navProfile',
        icon: Icons.person_outline,
        activeIcon: Icons.person,
      ),
    ];
  }

  // Admin / owner / branch manager / librarian default
  return [
    const ShellNavItem(
      path: '/app/dashboard',
      labelKey: 'navDashboard',
      icon: AppIcons.dashboard,
      activeIcon: AppIcons.dashboardActive,
    ),
    if (registry.canViewRoute(user, MobileRoute.messages))
      const ShellNavItem(
        path: '/app/messages',
        labelKey: 'navMessages',
        icon: AppIcons.messages,
        activeIcon: AppIcons.messagesActive,
      ),
    const ShellNavItem(
      path: '/app/profile',
      labelKey: 'navProfile',
      icon: Icons.person_outline,
      activeIcon: Icons.person,
    ),
    const ShellNavItem(
      path: '/app/settings',
      labelKey: 'navSettings',
      icon: Icons.settings_outlined,
      activeIcon: Icons.settings,
    ),
  ];
}

int shellNavIndexFor(String location, List<ShellNavItem> items) {
  for (var i = 0; i < items.length; i++) {
    if (location.startsWith(items[i].path)) return i;
  }
  return 0;
}
