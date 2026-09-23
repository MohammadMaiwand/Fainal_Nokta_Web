import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/env_config.dart';
import '../../app/navigation_config.dart';
import '../../core/auth/permission_service.dart';
import '../../core/design/app_icons.dart';
import '../../core/permissions/mobile_permission_registry.dart';
import '../../core/widgets/logout_action.dart';
import '../../features/auth/models/user_profile.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../l10n/app_localizations.dart';

class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final location = GoRouterState.of(context).uri.toString();
    final user = ref.watch(authProvider).user;
    final registry = ref.watch(permissionServiceProvider).registry;

    if (user == null) {
      return Scaffold(body: SafeArea(child: child));
    }

    final navItems = shellNavItemsFor(user, registry);
    final navIndex = shellNavIndexFor(location, navItems);

    String labelFor(ShellNavItem item) => switch (item.labelKey) {
          'navDashboard' => l10n.navDashboard,
          'navMessages' => l10n.navMessages,
          'navProfile' => l10n.navProfile,
          'navSettings' => l10n.navSettings,
          'navTimetable' => l10n.navTimetable,
          'navAttendance' => l10n.navAttendance,
          'navPayments' => l10n.navPayments,
          'navExpenses' => l10n.navExpenses,
          'navFamily' => l10n.navFamily,
          _ => item.labelKey,
        };

    final showBottomNav =
        !location.contains('/forbidden') && !location.contains('/dev/');

    return Scaffold(
      drawer: _AppDrawer(user: user, registry: registry),
      body: SafeArea(child: child),
      bottomNavigationBar: showBottomNav && navItems.isNotEmpty
          ? NavigationBar(
              selectedIndex: navIndex.clamp(0, navItems.length - 1),
              onDestinationSelected: (i) => context.go(navItems[i].path),
              destinations: [
                for (final item in navItems)
                  NavigationDestination(
                    icon: Icon(item.icon),
                    selectedIcon: Icon(item.activeIcon),
                    label: labelFor(item),
                  ),
              ],
            )
          : null,
    );
  }

}

class _AppDrawer extends ConsumerWidget {
  const _AppDrawer({required this.user, required this.registry});
  final UserProfile user;
  final MobilePermissionRegistry registry;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final routes = registry.drawerRoutesFor(user);
    var query = '';

    String label(MobileRoute route) => switch (route) {
          MobileRoute.timetable => l10n.navTimetable,
          MobileRoute.attendance => l10n.navAttendance,
          MobileRoute.payments => l10n.navPayments,
          MobileRoute.results => l10n.navResults,
          MobileRoute.classes => l10n.navClasses,
          MobileRoute.subjects => l10n.navSubjects,
          MobileRoute.notifications => l10n.navNotifications,
          MobileRoute.messages => l10n.navMessages,
          MobileRoute.students => l10n.navStudents,
          MobileRoute.teachers => l10n.navTeachers,
          MobileRoute.finance => l10n.navFinance,
          MobileRoute.reports => l10n.navReports,
          MobileRoute.library => l10n.navLibrary,
          MobileRoute.expenses => l10n.navExpenses,
          MobileRoute.salaries => l10n.navSalaries,
          MobileRoute.audit => l10n.navAudit,
          _ => '',
        };

    IconData icon(MobileRoute route) => switch (route) {
          MobileRoute.timetable => Icons.calendar_month,
          MobileRoute.attendance => Icons.fact_check,
          MobileRoute.payments => Icons.payments,
          MobileRoute.results => Icons.emoji_events,
          MobileRoute.classes => Icons.class_,
          MobileRoute.subjects => Icons.menu_book,
          MobileRoute.notifications => Icons.notifications,
          MobileRoute.messages => Icons.mail,
          MobileRoute.students => Icons.people,
          MobileRoute.teachers => Icons.school,
          MobileRoute.finance => Icons.account_balance_wallet,
          MobileRoute.reports => Icons.summarize,
          MobileRoute.library => Icons.local_library,
          MobileRoute.expenses => Icons.receipt_long,
          MobileRoute.salaries => Icons.payments_outlined,
          MobileRoute.audit => AppIcons.audit,
          _ => Icons.circle,
        };

    final filtered = routes.where((r) {
      if (query.isEmpty) return true;
      return label(r).toLowerCase().contains(query.toLowerCase());
    }).toList();

    return Drawer(
      child: SafeArea(
        child: StatefulBuilder(
          builder: (context, setState) {
            return ListView(
              children: [
                ListTile(
                  title: Text(user.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                  subtitle: Text(user.role),
                ),
                if (routes.length > 8)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: TextField(
                      decoration: InputDecoration(
                        hintText: l10n.drawerSearch,
                        prefixIcon: const Icon(Icons.search),
                        isDense: true,
                      ),
                      onChanged: (v) => setState(() => query = v),
                    ),
                  ),
                const Divider(),
                ...filtered.map(
                  (route) => ListTile(
                    minVerticalPadding: 12,
                    leading: Icon(icon(route)),
                    title: Text(label(route), style: const TextStyle(fontSize: 16)),
                    onTap: () {
                      Navigator.pop(context);
                      context.go(registry.goPathFor(route));
                    },
                  ),
                ),
                if (EnvConfig.isDevelopment) ...[
                  const Divider(),
                  ListTile(
                    leading: const Icon(Icons.bug_report_outlined),
                    title: Text(l10n.devReadinessTitle),
                    onTap: () {
                      Navigator.pop(context);
                      context.push('/app/dev/readiness');
                    },
                  ),
                ],
                const Divider(),
                LogoutButton(compact: true),
                ListTile(
                  leading: const Icon(Icons.settings_outlined),
                  title: Text(l10n.navSettings),
                  onTap: () {
                    Navigator.pop(context);
                    context.go('/app/settings');
                  },
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
