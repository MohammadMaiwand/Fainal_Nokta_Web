import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/constants.dart';
import '../../../app/theme.dart';
import '../../../core/auth/permission_service.dart';
import '../../../core/providers/resource_repository_provider.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/logout_action.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../features/settings/providers/settings_provider.dart';
import '../../../l10n/app_localizations.dart';

class ResultsScreen extends ConsumerStatefulWidget {
  const ResultsScreen({super.key});

  @override
  ConsumerState<ResultsScreen> createState() => _ResultsScreenState();
}

class _ResultsScreenState extends ConsumerState<ResultsScreen> {
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    final lang = ref.read(settingsProvider).locale.languageCode;
    _future = ref.read(resourceRepositoryProvider).list(
          ApiPaths.results,
          params: {'limit': 100, 'lang': lang},
        );
  }

  String _title(Map<String, dynamic> item) {
    final exam = item['exam'];
    final student = item['student'];
    final examTitle = exam is Map ? '${exam['title'] ?? ''}' : '';
    final studentName = student is Map
        ? '${student['firstName'] ?? ''} ${student['lastName'] ?? ''}'.trim()
        : '${item['studentName'] ?? ''}';
    return examTitle.isNotEmpty ? examTitle : studentName;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final registry = ref.watch(permissionServiceProvider).registry;
    final user = ref.watch(authProvider).user;
    final canEdit = registry.canEditResults(user);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.navResults),
        actions: const [AppBarLogoutAction()],
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: FutureBuilder<List<Map<String, dynamic>>>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(child: Text('${snapshot.error}'));
                }
                final items = snapshot.data ?? [];
                if (items.isEmpty) {
                  return Center(child: Text(l10n.emptyState));
                }
                return RefreshIndicator(
                  onRefresh: () async {
                    setState(_reload);
                    await _future;
                  },
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final item = items[index];
                      final id = '${item['_id'] ?? item['id'] ?? ''}';
                      final score = item['score'];
                      final grade = item['grade'];
                      return GlassCard(
                        onTap: id.isEmpty
                            ? null
                            : () => context.push('/app/results/$id'),
                        child: ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(_title(item), style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text(
                            [
                              if (score != null) 'Score: $score',
                              if (grade != null) 'Grade: $grade',
                              if (item['remarks'] != null) '${item['remarks']}',
                            ].where((e) => e.isNotEmpty).join(' • '),
                          ),
                          trailing: canEdit
                              ? const Icon(Icons.edit_note, color: AppColors.primary)
                              : const Icon(Icons.chevron_right),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
