import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/auth/permission_service.dart';
import '../../../core/cache/offline_cache_service.dart';
import '../../../core/network/network_status.dart';
import '../../../core/providers/repositories_provider.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_error_views.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/logout_action.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../core/widgets/route_guard.dart';
import '../../../core/permissions/mobile_permission_registry.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../features/family/providers/family_providers.dart';
import '../../../l10n/app_localizations.dart';

class AttendanceScreen extends ConsumerStatefulWidget {
  const AttendanceScreen({super.key});

  @override
  ConsumerState<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends ConsumerState<AttendanceScreen> {
  late Future<_AttendanceData> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    final user = ref.read(authProvider).user;
    final studentId = ref.read(selectedStudentIdProvider);
    final repo = ref.read(attendanceRepositoryProvider);
    _future = Future.wait([
      repo.summary(studentId: studentId),
      repo.activeSessions(),
      repo.list(params: {
        'limit': 20,
        if (studentId != null) 'studentId': studentId,
      }),
    ]).then((r) => _AttendanceData(
          summary: r[0] as Map<String, dynamic>,
          sessions: r[1] as Map<String, dynamic>,
          records: r[2] as List<Map<String, dynamic>>,
          user: user,
        ));
  }

  Future<void> _markSession(Map<String, dynamic> session) async {
    final l10n = AppLocalizations.of(context)!;
    final online = ref.read(networkOnlineProvider).value ?? true;
    if (!online) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.errorOfflineBlocked)),
      );
      return;
    }
    final registry = ref.read(permissionServiceProvider).registry;
    if (!registry.canMarkAttendance(ref.read(authProvider).user)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.errorPermission)),
      );
      return;
    }
    final timetableId = '${session['timetableId'] ?? session['_id'] ?? ''}';
    if (timetableId.isEmpty) return;
    final isOpen = session['isOpen'] == true || session['attendanceStatus'] == 'active';
    if (!isOpen) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(session['message'] ?? l10n.attendanceSessionClosed)),
      );
      return;
    }
    try {
      await HapticFeedback.lightImpact();
      await ref.read(attendanceRepositoryProvider).mark(
            timetableId: timetableId,
            status: 'present',
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.attendanceMarked)),
      );
      setState(_reload);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final showCached = ref.watch(showingCachedDataProvider);
    return RouteGuard(
      route: MobileRoute.attendance,
      child: Scaffold(
        appBar: AppBar(
          title: Text(l10n.navAttendance),
          actions: const [AppBarLogoutAction()],
        ),
        body: Column(
          children: [
            const OfflineBanner(),
            if (showCached) const CachedDataBanner(),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  setState(_reload);
                  await _future;
                },
                child: FutureBuilder<_AttendanceData>(
                  future: _future,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return ListView(
                        children: const [
                          SizedBox(height: 120),
                          Center(child: CircularProgressIndicator()),
                        ],
                      );
                    }
                    if (snapshot.hasError) {
                      final err = snapshot.error;
                      if (err is ApiException && err.isPermissionDenied) {
                        return AppErrorView(type: AppErrorType.permission);
                      }
                      return AppErrorView(
                        type: AppErrorType.backend,
                        onRetry: () => setState(_reload),
                      );
                    }
                    final data = snapshot.data!;
                    final summary = data.summary;
                    final active = (data.sessions['active'] as List?)?.cast<Map>() ?? [];
                    final upcoming = (data.sessions['upcoming'] as List?)?.cast<Map>() ?? [];
                    final user = data.user;
                    final canMark = ref.read(permissionServiceProvider).registry.canMarkAttendance(user);

                    return ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        _SummaryRow(summary: summary, l10n: l10n),
                        const SizedBox(height: 20),
                        Text(l10n.attendanceActiveSessions, style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 8),
                        if (active.isEmpty && upcoming.isEmpty)
                          Text(l10n.emptyState)
                        else ...[
                          ...active.map((s) => _SessionCard(
                                session: Map<String, dynamic>.from(s),
                                canMark: canMark,
                                onMark: () => _markSession(Map<String, dynamic>.from(s)),
                                l10n: l10n,
                              )),
                          ...upcoming.map((s) => _SessionCard(
                                session: Map<String, dynamic>.from(s),
                                canMark: false,
                                l10n: l10n,
                              )),
                        ],
                        const SizedBox(height: 20),
                        Text(l10n.attendanceRecent, style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 8),
                        ...data.records.take(15).map((r) => GlassCard(
                              padding: const EdgeInsets.all(16),
                              child: ListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text('${r['className'] ?? ''} • ${r['status'] ?? ''}'),
                                subtitle: Text(
                                  formatDisplayDate(
                                    DateTime.tryParse('${r['attendanceDate']}'),
                                    useJalali: true,
                                  ),
                                ),
                              ),
                            )),
                      ],
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AttendanceData {
  _AttendanceData({
    required this.summary,
    required this.sessions,
    required this.records,
    required this.user,
  });
  final Map<String, dynamic> summary;
  final Map<String, dynamic> sessions;
  final List<Map<String, dynamic>> records;
  final dynamic user;
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.summary, required this.l10n});
  final Map<String, dynamic> summary;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: _Chip(label: l10n.attendancePresent, value: '${summary['present'] ?? 0}', color: AppColors.success)),
        const SizedBox(width: 8),
        Expanded(child: _Chip(label: l10n.attendanceAbsent, value: '${summary['absent'] ?? 0}', color: AppColors.danger)),
        const SizedBox(width: 8),
        Expanded(child: _Chip(label: l10n.attendanceLate, value: '${summary['late'] ?? 0}', color: AppColors.warning)),
      ],
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color)),
          const SizedBox(height: 4),
          Text(label, textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

class _SessionCard extends StatelessWidget {
  const _SessionCard({
    required this.session,
    required this.canMark,
    required this.l10n,
    this.onMark,
  });
  final Map<String, dynamic> session;
  final bool canMark;
  final VoidCallback? onMark;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final status = '${session['attendanceStatus'] ?? session['status'] ?? 'upcoming'}';
    final isActive = status == 'active' || session['isOpen'] == true;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${session['className'] ?? session['subjectName'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 4),
            Text('${session['teacherName'] ?? ''} • ${session['startTime'] ?? ''}-${session['endTime'] ?? ''}'),
            const SizedBox(height: 8),
            Text(status.toUpperCase(), style: TextStyle(color: isActive ? AppColors.success : AppColors.warning)),
            if (canMark && onMark != null) ...[
              const SizedBox(height: 12),
              FilledButton(
                onPressed: isActive ? onMark : null,
                child: Text(isActive ? l10n.attendanceMarkPresent : l10n.attendanceSessionClosed),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
