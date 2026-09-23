import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/design/app_spacing.dart';
import '../../../core/permissions/mobile_permission_registry.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../l10n/app_localizations.dart';
import '../../../core/auth/permission_service.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/family_providers.dart';

class StudentDetailScreen extends ConsumerWidget {
  const StudentDetailScreen({super.key, required this.studentId});

  final String studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final students = ref.watch(familyStudentsProvider).value ?? [];
    final student = students.cast<Map<String, dynamic>?>().firstWhere(
          (s) => '${s?['_id'] ?? s?['id']}' == studentId,
          orElse: () => null,
        );
    final name = student != null
        ? readLocalizedText(student['fullName'] ?? student['name'] ?? '')
        : l10n.navStudents;
    final registry = ref.watch(permissionServiceProvider).registry;
    final user = ref.watch(authProvider).user!;

    final actions = <({String label, String path, IconData icon})>[
      if (registry.canViewRoute(user, MobileRoute.timetable))
        (label: l10n.navTimetable, path: '/app/timetable', icon: Icons.calendar_month),
      if (registry.canViewRoute(user, MobileRoute.attendance))
        (label: l10n.navAttendance, path: '/app/attendance', icon: Icons.fact_check),
      if (registry.canViewRoute(user, MobileRoute.payments))
        (label: l10n.navPayments, path: '/app/payments', icon: Icons.payments),
      if (registry.canViewRoute(user, MobileRoute.results))
        (label: l10n.navResults, path: '/app/results', icon: Icons.emoji_events),
      if (registry.canViewRoute(user, MobileRoute.messages))
        (label: l10n.navMessages, path: '/app/messages', icon: Icons.mail),
    ];

    return Scaffold(
      appBar: AppBar(title: Text(name)),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.page),
        children: [
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.familyStudentDashboard, style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                Text(l10n.familyStudentHint, style: const TextStyle(fontSize: 16)),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.section),
          ...actions.map(
            (a) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: GlassCard(
                child: ListTile(
                  minVerticalPadding: AppSpacing.minTap / 2,
                  leading: Icon(a.icon),
                  title: Text(a.label, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    ref.read(selectedStudentIdProvider.notifier).state = studentId;
                    context.push(a.path);
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
