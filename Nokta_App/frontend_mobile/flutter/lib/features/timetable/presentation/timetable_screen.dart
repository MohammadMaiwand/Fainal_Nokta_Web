import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/cache/offline_cache_service.dart';
import '../../../core/providers/repositories_provider.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_error_views.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../core/widgets/logout_action.dart';
import '../../../core/widgets/route_guard.dart';
import '../../../core/permissions/mobile_permission_registry.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../l10n/app_localizations.dart';

class TimetableScreen extends ConsumerStatefulWidget {
  const TimetableScreen({super.key});

  @override
  ConsumerState<TimetableScreen> createState() => _TimetableScreenState();
}

class _TimetableScreenState extends ConsumerState<TimetableScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _reload();
  }

  void _reload() {
    final user = ref.read(authProvider).user;
    _future = ref.read(timetableRepositoryProvider).week(user: user);
  }

  int _todayDow() {
    // Backend may use 0=Saturday or 1=Monday — match JS getDay where possible
    final w = DateTime.now().weekday; // 1 Mon .. 7 Sun
    return w == 7 ? 0 : w; // approximate
  }

  bool _isNow(Map<String, dynamic> e) {
    final now = TimeOfDay.now();
    final start = _parseTime('${e['startTime']}');
    final end = _parseTime('${e['endTime']}');
    if (start == null || end == null) return false;
    final nowMin = now.hour * 60 + now.minute;
    final s = start.hour * 60 + start.minute;
    final en = end.hour * 60 + end.minute;
    return nowMin >= s && nowMin <= en;
  }

  TimeOfDay? _parseTime(String raw) {
    final parts = raw.split(':');
    if (parts.length < 2) return null;
    final h = int.tryParse(parts[0]);
    final m = int.tryParse(parts[1]);
    if (h == null || m == null) return null;
    return TimeOfDay(hour: h, minute: m);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final showCached = ref.watch(showingCachedDataProvider);
    return RouteGuard(
      route: MobileRoute.timetable,
      child: Scaffold(
        appBar: AppBar(
          title: Text(l10n.navTimetable),
          actions: const [AppBarLogoutAction()],
          bottom: TabBar(
            controller: _tabs,
            tabs: [
              Tab(text: l10n.timetableToday),
              Tab(text: l10n.timetableWeek),
            ],
          ),
        ),
        body: Column(
          children: [
            const OfflineBanner(),
            if (showCached) const CachedDataBanner(),
            Expanded(
              child: FutureBuilder<List<Map<String, dynamic>>>(
                future: _future,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    final err = snapshot.error;
                    if (err is ApiException && err.isPermissionDenied) {
                      return const AppErrorView(type: AppErrorType.permission);
                    }
                    return AppErrorView(
                      type: AppErrorType.backend,
                      onRetry: () => setState(_reload),
                    );
                  }
                  final items = snapshot.data ?? [];
                  final todayDow = _todayDow();
                  final todayItems = items.where((e) => (e['dayOfWeek'] as num?)?.toInt() == todayDow).toList();
                  return TabBarView(
                    controller: _tabs,
                    children: [
                      _TimetableList(
                        items: todayItems,
                        emptyLabel: l10n.timetableEmptyToday,
                        highlightNow: true,
                        isNow: _isNow,
                        onRefresh: () async {
                          setState(_reload);
                          await _future;
                        },
                      ),
                      _TimetableList(
                        items: items,
                        emptyLabel: l10n.emptyState,
                        highlightNow: false,
                        isNow: _isNow,
                        onRefresh: () async {
                          setState(_reload);
                          await _future;
                        },
                      ),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TimetableList extends StatelessWidget {
  const _TimetableList({
    required this.items,
    required this.emptyLabel,
    required this.highlightNow,
    required this.isNow,
    required this.onRefresh,
  });

  final List<Map<String, dynamic>> items;
  final String emptyLabel;
  final bool highlightNow;
  final bool Function(Map<String, dynamic>) isNow;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return AppErrorView(type: AppErrorType.empty, message: emptyLabel);
    }
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        itemBuilder: (_, i) {
          final e = items[i];
          final active = highlightNow && isNow(e);
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: GlassCard(
              child: Container(
                decoration: active
                    ? BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.primary, width: 2),
                      )
                    : null,
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      readLocalizedText(e['subjectName'] ?? e['className']),
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                    ),
                    const SizedBox(height: 6),
                    Text('${e['className'] ?? ''} • ${e['teacherName'] ?? ''}'),
                    const SizedBox(height: 4),
                    Text('${e['startTime'] ?? ''} – ${e['endTime'] ?? ''} • ${e['room'] ?? ''}'),
                    if (active)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          '● ${AppLocalizations.of(context)!.timetableNow}',
                          style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
