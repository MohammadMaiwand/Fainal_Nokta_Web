import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/constants.dart';
import '../../../core/design/app_spacing.dart';
import '../../../core/providers/resource_repository_provider.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/logout_action.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../core/widgets/shimmer_box.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../l10n/app_localizations.dart';

class AuditScreen extends ConsumerStatefulWidget {
  const AuditScreen({super.key});

  @override
  ConsumerState<AuditScreen> createState() => _AuditScreenState();
}

class _AuditScreenState extends ConsumerState<AuditScreen> {
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _future = ref.read(resourceRepositoryProvider).list(
          ApiPaths.audit,
          params: {'limit': 50, 'page': 1},
        );
  }

  StatusTone _tone(String? severity) => switch (severity) {
        'critical' => StatusTone.danger,
        'warning' => StatusTone.warning,
        _ => StatusTone.info,
      };

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.navAudit),
        actions: const [AppBarLogoutAction()],
      ),
      body: Column(
        children: [
          const OfflineBanner(),
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
                    return ListView(children: [Center(child: Text(l10n.errorPermission))]);
                  }
                  final items = snapshot.data ?? [];
                  if (items.isEmpty) {
                    return ListView(children: [Center(child: Text(l10n.emptyState))]);
                  }
                  return ListView.builder(
                    padding: const EdgeInsets.all(AppSpacing.page),
                    itemCount: items.length,
                    itemBuilder: (_, i) {
                      final item = items[i];
                      final action = '${item['action'] ?? item['type'] ?? ''}';
                      final actor = '${item['actorName'] ?? item['userName'] ?? ''}';
                      final time = '${item['createdAt'] ?? item['timestamp'] ?? ''}';
                      return Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.md),
                        child: GlassCard(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 4,
                                height: 72,
                                decoration: BoxDecoration(
                                  color: Theme.of(context).colorScheme.primary,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            action,
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ),
                                        StatusBadge(
                                          label: '${item['severity'] ?? 'info'}',
                                          tone: _tone(item['severity'] as String?),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(actor, style: const TextStyle(fontSize: 15)),
                                    const SizedBox(height: 4),
                                    Text(time, style: Theme.of(context).textTheme.bodySmall),
                                  ],
                                ),
                              ),
                            ],
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
