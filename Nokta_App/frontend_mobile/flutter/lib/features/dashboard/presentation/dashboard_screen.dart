import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/constants.dart';
import '../../../app/theme.dart';
import '../../../core/auth/permission_service.dart';
import '../../../core/cache/offline_cache_service.dart';
import '../../../core/permissions/mobile_permission_registry.dart';
import '../../../core/providers/repositories_provider.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_error_views.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/logout_action.dart';
import '../../../core/widgets/quick_action_tile.dart';
import '../../../features/auth/models/user_profile.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../features/dashboard/providers/dashboard_provider.dart';
import '../../../features/settings/providers/settings_provider.dart';
import '../../../l10n/app_localizations.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final user = ref.watch(authProvider).user;
    if (user == null) return Center(child: Text(l10n.loading));

    final registry = ref.watch(permissionServiceProvider).registry;
    final locale = ref.watch(settingsProvider).locale.languageCode;
    final showCached = ref.watch(showingCachedDataProvider);
    final dashboardAsync = ref.watch(dashboardDataProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(dashboardDataProvider);
        await ref.read(dashboardDataProvider.future);
        if (registry.canViewRoute(user, MobileRoute.messages)) {
          await ref.read(messagesRepositoryProvider).unreadCount();
        }
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
        children: [
          if (showCached) const CachedDataBanner(),
          Row(
            children: [
              Builder(
                builder: (ctx) => IconButton(
                  icon: const Icon(Icons.menu_rounded),
                  tooltip: l10n.quickActions,
                  onPressed: () => Scaffold.of(ctx).openDrawer(),
                ),
              ),
              const Spacer(),
              const AppBarLogoutAction(),
            ],
          ),
          Text(
            '${l10n.welcomeBack}, ${user.name}',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          Text(
            '${user.email} • ${_roleLabel(user)}',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 20),
          dashboardAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: 32),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (error, _) => AppErrorView(
              type: AppErrorType.backend,
              message: '$error',
              onRetry: () => ref.invalidate(dashboardDataProvider),
            ),
            data: (data) => _RoleDashboardBody(user: user, data: data, locale: locale),
          ),
          const SizedBox(height: 16),
          if (registry.canViewRoute(user, MobileRoute.messages))
            FutureBuilder<int>(
              future: ref.read(messagesRepositoryProvider).unreadCount(),
              builder: (context, snapshot) {
                final count = snapshot.data ?? 0;
                return GlassCard(
                  onTap: () => context.go(registry.goPathFor(MobileRoute.messages)),
                  child: ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.secondary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.mark_email_unread_outlined, color: AppColors.secondary),
                    ),
                    title: Text(l10n.unreadMessages),
                    trailing: CircleAvatar(
                      backgroundColor: AppColors.primary,
                      child: Text('$count', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                    ),
                  ),
                );
              },
            ),
          const SizedBox(height: 20),
          Text(
            l10n.quickActions,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          _QuickActionsSection(user: user, registry: registry),
          const SizedBox(height: 24),
          const LogoutButton(),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  String _roleLabel(UserProfile user) {
    return switch (user.effectiveRole) {
      AppRoles.superAdmin => 'Super Admin',
      AppRoles.admin => 'Admin',
      AppRoles.teacher => 'Teacher',
      AppRoles.student => 'Student',
      AppRoles.parent => 'Parent',
      AppRoles.accountant => 'Accountant',
      AppRoles.owner => 'Owner',
      _ => user.role,
    };
  }
}

class _QuickActionsSection extends StatelessWidget {
  const _QuickActionsSection({required this.user, required this.registry});

  final UserProfile user;
  final MobilePermissionRegistry registry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final actions = registry.dashboardQuickActions(user);

    final items = <QuickActionItem>[];
    for (final action in actions) {
      final route = registry.routeFromQuickAction(action);
      if (route == null) continue;
      if (!registry.canViewRoute(user, route)) continue;

      final path = (user.isRole(AppRoles.student) && action == 'classes')
          ? '/app/my-enrollment'
          : registry.goPathFor(route);

      items.add(
        QuickActionItem(
          label: _actionLabel(l10n, action),
          icon: _actionIcon(action),
          colors: _actionColors(action),
          onTap: () => context.go(path),
        ),
      );
    }

    return QuickActionGrid(actions: items);
  }

  String _actionLabel(AppLocalizations l10n, String action) {
    return switch (action) {
      'profile' => l10n.navProfile,
      'messages' => l10n.navMessages,
      'notifications' => l10n.navNotifications,
      'timetable' => l10n.navTimetable,
      'attendance' => l10n.navAttendance,
      'payments' => l10n.navPayments,
      'results' => l10n.navResults,
      'classes' => l10n.navClasses,
      'students' => l10n.navStudents,
      'teachers' => l10n.navTeachers,
      'finance' => user.isRole(AppRoles.teacher) ? 'My salary' : l10n.navFinance,
      'reports' => l10n.navReports,
      'library' => l10n.navLibrary,
      'family' => l10n.navFamily,
      'expenses' => l10n.navExpenses,
      'audit' => l10n.navAudit,
      _ => action,
    };
  }

  IconData _actionIcon(String action) {
    return switch (action) {
      'profile' => Icons.person_rounded,
      'messages' => Icons.chat_bubble_rounded,
      'notifications' => Icons.notifications_active_rounded,
      'timetable' => Icons.calendar_month_rounded,
      'attendance' => Icons.fact_check_rounded,
      'payments' => Icons.payments_rounded,
      'results' => Icons.emoji_events_rounded,
      'classes' => Icons.class_rounded,
      'students' => Icons.groups_rounded,
      'teachers' => Icons.school_rounded,
      'finance' => Icons.account_balance_wallet_rounded,
      'reports' => Icons.analytics_rounded,
      'library' => Icons.local_library_rounded,
      'family' => Icons.family_restroom_rounded,
      'expenses' => Icons.receipt_long_rounded,
      'audit' => Icons.security_rounded,
      _ => Icons.arrow_forward_rounded,
    };
  }

  List<Color> _actionColors(String action) {
    return switch (action) {
      'profile' => [const Color(0xFF6366F1), const Color(0xFF8B5CF6)],
      'messages' => [const Color(0xFF06B6D4), const Color(0xFF3B82F6)],
      'notifications' => [const Color(0xFFF59E0B), const Color(0xFFEF4444)],
      'timetable' => [const Color(0xFF14B8A6), const Color(0xFF06B6D4)],
      'attendance' => [const Color(0xFF22C55E), const Color(0xFF16A34A)],
      'payments' => [const Color(0xFF10B981), const Color(0xFF059669)],
      'results' => [const Color(0xFF8B5CF6), const Color(0xFF6366F1)],
      'classes' => [const Color(0xFF3B82F6), const Color(0xFF2563EB)],
      'students' => [const Color(0xFF4F46E5), const Color(0xFF7C3AED)],
      'teachers' => [const Color(0xFF0EA5E9), const Color(0xFF0284C7)],
      'finance' => [const Color(0xFFF97316), const Color(0xFFEA580C)],
      'reports' => [const Color(0xFF64748B), const Color(0xFF475569)],
      'library' => [const Color(0xFF84CC16), const Color(0xFF65A30D)],
      'family' => [const Color(0xFFEC4899), const Color(0xFFDB2777)],
      'expenses' => [const Color(0xFFEF4444), const Color(0xFFB91C1C)],
      'audit' => [const Color(0xFF334155), const Color(0xFF1E293B)],
      _ => [AppColors.primary, AppColors.secondary],
    };
  }
}

class _RoleDashboardBody extends StatelessWidget {
  const _RoleDashboardBody({
    required this.user,
    required this.data,
    required this.locale,
  });

  final UserProfile user;
  final Map<String, dynamic> data;
  final String locale;

  @override
  Widget build(BuildContext context) {
    final role = user.effectiveRole;
    if (role == AppRoles.student || role == AppRoles.familyStudent) {
      return _StudentCards(data: data, locale: locale);
    }
    if (role == AppRoles.parent) {
      return _ParentCards(data: data, locale: locale);
    }
    if (role == AppRoles.teacher) {
      return _TeacherCards(data: data, locale: locale);
    }
    if (role == AppRoles.accountant) {
      return _AccountantCards(data: data, locale: locale);
    }
    if (role == AppRoles.librarian) {
      return _LibrarianCards(data: data);
    }
    if (role == AppRoles.owner) {
      return _OwnerCards(data: data, locale: locale);
    }
    return _AdminCards(data: data, locale: locale);
  }
}

class _StudentCards extends StatelessWidget {
  const _StudentCards({required this.data, required this.locale});

  final Map<String, dynamic> data;
  final String locale;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final profile = data['profile'] is Map ? data['profile'] as Map : {};
    return _MetricGrid(
      cards: [
        _MetricCard(
          label: 'Fee amount',
          value: formatCurrencyAfn((data['feeAmount'] as num?) ?? (profile['feeAmount'] as num?) ?? 0, locale: locale),
          icon: Icons.payments_rounded,
          gradient: const [Color(0xFF3B82F6), Color(0xFF6366F1)],
        ),
        _MetricCard(
          label: 'Remaining balance',
          value: formatCurrencyAfn((data['remainingBalance'] as num?) ?? (profile['remainingBalance'] as num?) ?? 0, locale: locale),
          icon: Icons.account_balance_wallet_rounded,
          gradient: const [Color(0xFFF59E0B), Color(0xFFEF4444)],
        ),
        _MetricCard(
          label: l10n.navAttendance,
          value: '${data['attendanceCount'] ?? 0}',
          icon: Icons.fact_check_rounded,
          gradient: const [Color(0xFF22C55E), Color(0xFF16A34A)],
        ),
        _MetricCard(
          label: 'Paid total',
          value: formatCurrencyAfn((data['paidTotal'] as num?) ?? 0, locale: locale),
          icon: Icons.check_circle_rounded,
          gradient: const [Color(0xFF06B6D4), Color(0xFF0891B2)],
        ),
        _MetricCard(
          label: l10n.navResults,
          value: '${data['resultsCount'] ?? (data['results'] as List?)?.length ?? 0}',
          icon: Icons.emoji_events_rounded,
          gradient: const [Color(0xFF8B5CF6), Color(0xFF7C3AED)],
        ),
        _MetricCard(
          label: l10n.navPayments,
          value: '${data['paymentsCount'] ?? (data['payments'] as List?)?.length ?? 0}',
          icon: Icons.receipt_long_rounded,
          gradient: const [Color(0xFF14B8A6), Color(0xFF0D9488)],
        ),
      ],
    );
  }
}

class _TeacherCards extends StatelessWidget {
  const _TeacherCards({required this.data, required this.locale});

  final Map<String, dynamic> data;
  final String locale;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return _MetricGrid(
      cards: [
        _MetricCard(
          label: l10n.navStudents,
          value: '${data['totalStudents'] ?? 0}',
          icon: Icons.groups_rounded,
          gradient: const [Color(0xFF4F46E5), Color(0xFF7C3AED)],
        ),
        _MetricCard(
          label: l10n.navClasses,
          value: '${data['totalClasses'] ?? 0}',
          icon: Icons.class_rounded,
          gradient: const [Color(0xFF06B6D4), Color(0xFF3B82F6)],
        ),
        _MetricCard(
          label: l10n.navSubjects,
          value: '${data['totalSubjects'] ?? 0}',
          icon: Icons.menu_book_rounded,
          gradient: const [Color(0xFF22C55E), Color(0xFF16A34A)],
        ),
        _MetricCard(
          label: 'Salary payable',
          value: formatCurrencyAfn((data['teacherPayable'] as num?) ?? 0, locale: locale),
          icon: Icons.payments_rounded,
          gradient: const [Color(0xFFF97316), Color(0xFFEA580C)],
        ),
        _MetricCard(
          label: 'Tax total',
          value: formatCurrencyAfn((data['teacherTaxTotal'] as num?) ?? 0, locale: locale),
          icon: Icons.percent_rounded,
          gradient: const [Color(0xFFEF4444), Color(0xFFB91C1C)],
        ),
        _MetricCard(
          label: 'Unpaid balance',
          value: formatCurrencyAfn((data['teacherUnpaid'] as num?) ?? 0, locale: locale),
          icon: Icons.warning_amber_rounded,
          gradient: const [Color(0xFFF59E0B), Color(0xFFD97706)],
        ),
      ],
    );
  }
}

class _ParentCards extends StatelessWidget {
  const _ParentCards({required this.data, required this.locale});

  final Map<String, dynamic> data;
  final String locale;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return _MetricGrid(
      cards: [
        _MetricCard(
          label: l10n.navStudents,
          value: '${data['totalStudents'] ?? 0}',
          icon: Icons.family_restroom_rounded,
          gradient: const [Color(0xFFEC4899), Color(0xFFDB2777)],
        ),
        _MetricCard(
          label: l10n.navClasses,
          value: '${data['totalClasses'] ?? 0}',
          icon: Icons.class_rounded,
          gradient: const [Color(0xFF3B82F6), Color(0xFF2563EB)],
        ),
        _MetricCard(
          label: l10n.paymentsPending,
          value: formatCurrencyAfn((data['outstandingBalance'] as num?) ?? 0, locale: locale),
          icon: Icons.account_balance_wallet_rounded,
          gradient: const [Color(0xFFF59E0B), Color(0xFFEF4444)],
        ),
        _MetricCard(
          label: l10n.navNotifications,
          value: '${data['totalNotifications'] ?? 0}',
          icon: Icons.notifications_rounded,
          gradient: const [Color(0xFF8B5CF6), Color(0xFF6366F1)],
        ),
      ],
    );
  }
}

class _AdminCards extends StatelessWidget {
  const _AdminCards({required this.data, required this.locale});

  final Map<String, dynamic> data;
  final String locale;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return _MetricGrid(
      cards: [
        _MetricCard(
          label: l10n.navStudents,
          value: '${data['totalStudents'] ?? 0}',
          icon: Icons.people_rounded,
          gradient: const [Color(0xFF4F46E5), Color(0xFF7C3AED)],
        ),
        _MetricCard(
          label: l10n.navTeachers,
          value: '${data['totalTeachers'] ?? 0}',
          icon: Icons.school_rounded,
          gradient: const [Color(0xFF06B6D4), Color(0xFF3B82F6)],
        ),
        _MetricCard(
          label: l10n.navClasses,
          value: '${data['totalClasses'] ?? 0}',
          icon: Icons.class_rounded,
          gradient: const [Color(0xFF22C55E), Color(0xFF16A34A)],
        ),
        _MetricCard(
          label: l10n.paymentsPending,
          value: formatCurrencyAfn((data['outstandingBalance'] as num?) ?? 0, locale: locale),
          icon: Icons.account_balance_wallet_rounded,
          gradient: const [Color(0xFFF59E0B), Color(0xFFEF4444)],
        ),
        _MetricCard(
          label: 'Income total',
          value: formatCurrencyAfn((data['incomeTotal'] as num?) ?? 0, locale: locale),
          icon: Icons.trending_up_rounded,
          gradient: const [Color(0xFF10B981), Color(0xFF059669)],
        ),
        _MetricCard(
          label: l10n.navFinance,
          value: formatCurrencyAfn((data['expenseTotal'] as num?) ?? 0, locale: locale),
          icon: Icons.receipt_long_rounded,
          gradient: const [Color(0xFFEF4444), Color(0xFFB91C1C)],
        ),
      ],
    );
  }
}

class _AccountantCards extends StatelessWidget {
  const _AccountantCards({required this.data, required this.locale});

  final Map<String, dynamic> data;
  final String locale;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return _MetricGrid(
      cards: [
        _MetricCard(
          label: 'Income total',
          value: formatCurrencyAfn((data['incomeTotal'] as num?) ?? 0, locale: locale),
          icon: Icons.trending_up_rounded,
          gradient: const [Color(0xFF10B981), Color(0xFF059669)],
        ),
        _MetricCard(
          label: l10n.paymentsPending,
          value: formatCurrencyAfn((data['outstandingBalance'] as num?) ?? 0, locale: locale),
          icon: Icons.warning_amber_rounded,
          gradient: const [Color(0xFFF59E0B), Color(0xFFEF4444)],
        ),
        _MetricCard(
          label: l10n.navFinance,
          value: formatCurrencyAfn((data['expenseTotal'] as num?) ?? 0, locale: locale),
          icon: Icons.account_balance_rounded,
          gradient: const [Color(0xFF6366F1), Color(0xFF4F46E5)],
        ),
        _MetricCard(
          label: l10n.navPayments,
          value: '${data['totalUsers'] ?? 0}',
          icon: Icons.payments_rounded,
          gradient: const [Color(0xFF06B6D4), Color(0xFF0891B2)],
          subtitle: 'Active records',
        ),
      ],
    );
  }
}

class _OwnerCards extends StatelessWidget {
  const _OwnerCards({required this.data, required this.locale});

  final Map<String, dynamic> data;
  final String locale;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return _MetricGrid(
      cards: [
        _MetricCard(
          label: 'Income total',
          value: formatCurrencyAfn((data['incomeTotal'] as num?) ?? 0, locale: locale),
          icon: Icons.trending_up_rounded,
          gradient: const [Color(0xFF10B981), Color(0xFF059669)],
        ),
        _MetricCard(
          label: l10n.paymentsPending,
          value: formatCurrencyAfn((data['outstandingBalance'] as num?) ?? 0, locale: locale),
          icon: Icons.payments_rounded,
          gradient: const [Color(0xFFF59E0B), Color(0xFFEF4444)],
        ),
        _MetricCard(
          label: l10n.navStudents,
          value: '${data['totalStudents'] ?? 0}',
          icon: Icons.people_rounded,
          gradient: const [Color(0xFF4F46E5), Color(0xFF7C3AED)],
        ),
        _MetricCard(
          label: l10n.navReports,
          value: '${data['totalBooks'] ?? 0}',
          icon: Icons.summarize_rounded,
          gradient: const [Color(0xFF64748B), Color(0xFF475569)],
          subtitle: 'Library items',
        ),
      ],
    );
  }
}

class _LibrarianCards extends StatelessWidget {
  const _LibrarianCards({required this.data});

  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return _MetricGrid(
      cards: [
        _MetricCard(
          label: l10n.navLibrary,
          value: '${data['totalBooks'] ?? 0}',
          icon: Icons.local_library_rounded,
          gradient: const [Color(0xFF84CC16), Color(0xFF65A30D)],
        ),
      ],
    );
  }
}

class _MetricCard {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.gradient,
    this.subtitle,
  });

  final String label;
  final String value;
  final IconData icon;
  final List<Color> gradient;
  final String? subtitle;
}

class _MetricGrid extends StatelessWidget {
  const _MetricGrid({required this.cards});

  final List<_MetricCard> cards;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final cross = constraints.maxWidth > 520 ? 2 : 2;
        return GridView.builder(
          itemCount: cards.length,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: cross,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.45,
          ),
          itemBuilder: (context, index) {
            final card = cards[index];
            return _GradientMetricTile(card: card);
          },
        );
      },
    );
  }
}

class _GradientMetricTile extends StatelessWidget {
  const _GradientMetricTile({required this.card});

  final _MetricCard card;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: LinearGradient(
          colors: card.gradient,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: card.gradient.first.withValues(alpha: 0.28),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(card.icon, color: Colors.white, size: 20),
              ),
              const Spacer(),
            ],
          ),
          const Spacer(),
          Text(
            card.value,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 20,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            card.label,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.92),
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
          if (card.subtitle != null) ...[
            const SizedBox(height: 2),
            Text(
              card.subtitle!,
              style: TextStyle(color: Colors.white.withValues(alpha: 0.75), fontSize: 11),
            ),
          ],
        ],
      ),
    );
  }
}
