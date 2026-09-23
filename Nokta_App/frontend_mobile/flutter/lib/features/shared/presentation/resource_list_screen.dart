import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/constants.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/auth/permission_service.dart';
import '../../../core/cache/offline_cache_service.dart';
import '../../../core/permissions/mobile_permission_registry.dart';
import '../../../core/providers/resource_repository_provider.dart';
import '../../../core/utils/api_error_mapper.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_error_views.dart';
import '../../../core/design/app_spacing.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/shimmer_box.dart';
import '../../../core/widgets/logout_action.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../features/settings/providers/settings_provider.dart';
import '../../../l10n/app_localizations.dart';

class ResourceListScreen extends ConsumerStatefulWidget {
  const ResourceListScreen({super.key, required this.route});

  final MobileRoute route;

  @override
  ConsumerState<ResourceListScreen> createState() => _ResourceListScreenState();
}

class _ResourceListScreenState extends ConsumerState<ResourceListScreen> {
  late Future<List<Map<String, dynamic>>> _future;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _reload();
  }

  String _endpoint() {
    final user = ref.read(authProvider).user!;
    final registry = ref.read(permissionServiceProvider).registry;
    return switch (widget.route) {
      MobileRoute.students => registry.studentsListPath(user),
      MobileRoute.teachers => registry.teachersListPath(user),
      MobileRoute.finance => registry.financePath(user),
      MobileRoute.classes =>
        user.isRole(AppRoles.student) ? ApiPaths.studentsMeClasses : ApiPaths.classes,
      MobileRoute.subjects =>
        user.isRole(AppRoles.student) ? ApiPaths.studentsMeSubjects : ApiPaths.subjects,
      MobileRoute.results => ApiPaths.results,
      MobileRoute.notifications => ApiPaths.notifications,
      MobileRoute.library => ApiPaths.books,
      MobileRoute.reports => ApiPaths.reports,
      _ => ApiPaths.classes,
    };
  }

  Map<String, dynamic> _params() {
    final lang = ref.read(settingsProvider).locale.languageCode;
    if (widget.route == MobileRoute.results) {
      return {'limit': 100, 'lang': lang};
    }
    return {'limit': 100, 'lang': lang};
  }

  void _reload() {
    _future = ref.read(resourceRepositoryProvider).list(_endpoint(), params: _params());
  }

  String _title(AppLocalizations l10n) => switch (widget.route) {
        MobileRoute.notifications => l10n.navNotifications,
        MobileRoute.results => l10n.navResults,
        MobileRoute.classes => l10n.navClasses,
        MobileRoute.subjects => l10n.navSubjects,
        MobileRoute.students => l10n.navStudents,
        MobileRoute.teachers => l10n.navTeachers,
        MobileRoute.finance => l10n.navFinance,
        MobileRoute.reports => l10n.navReports,
        MobileRoute.library => l10n.navLibrary,
        _ => l10n.appTitle,
      };

  String _titleFor(Map<String, dynamic> item) {
    return readLocalizedText(
      item['title'] ??
          item['className'] ??
          item['name'] ??
          item['fullName'] ??
          item['subjectName'] ??
          item['studentName'],
    );
  }

  bool get _searchable => switch (widget.route) {
        MobileRoute.students || MobileRoute.teachers || MobileRoute.classes => true,
        _ => false,
      };

  List<Map<String, dynamic>> _filter(List<Map<String, dynamic>> items) {
    if (_search.isEmpty) return items;
    final q = _search.toLowerCase();
    return items.where((item) {
      final hay = '${_titleFor(item)} ${_subtitleFor(item)}'.toLowerCase();
      return hay.contains(q);
    }).toList();
  }

  String _subtitleFor(Map<String, dynamic> item) {
    final locale = ref.read(settingsProvider).locale.languageCode;
    final parts = <String>[
      if (item['status'] != null) '${item['status']}',
      if (item['className'] != null) readLocalizedText(item['className']),
      if (item['amount'] != null) formatCurrencyAfn((item['amount'] as num?) ?? 0, locale: locale),
    ];
    return parts.where((e) => e.isNotEmpty).join(' • ');
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final showCached = ref.watch(showingCachedDataProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(_title(l10n)),
        actions: const [AppBarLogoutAction()],
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          if (showCached) const CachedDataBanner(),
          if (_searchable)
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpacing.page, 0, AppSpacing.page, 8),
              child: TextField(
                decoration: InputDecoration(
                  hintText: l10n.drawerSearch,
                  prefixIcon: const Icon(Icons.search),
                ),
                onChanged: (v) => setState(() => _search = v.trim()),
              ),
            ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                setState(_reload);
                await _future;
              },
              child: FutureBuilder<List<Map<String, dynamic>>>(
                future: _future,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const ShimmerList();
                  }
                  if (snapshot.hasError) {
                    final err = snapshot.error;
                    if (err is ApiException) {
                      return AppErrorView(
                        type: appErrorTypeFor(err),
                        message: err.message,
                        onRetry: () => setState(_reload),
                      );
                    }
                    return AppErrorView(type: AppErrorType.backend, onRetry: () => setState(_reload));
                  }
                  final items = _filter(snapshot.data ?? []);
                  if (items.isEmpty) {
                    return AppErrorView(type: AppErrorType.empty, message: l10n.emptyState);
                  }
                  return ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: items.length,
                    itemBuilder: (_, index) {
                      final item = items[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: GlassCard(
                          child: ListTile(
                            title: Text(_titleFor(item), maxLines: 2, overflow: TextOverflow.ellipsis),
                            subtitle: Text(_subtitleFor(item), maxLines: 2, overflow: TextOverflow.ellipsis),
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
