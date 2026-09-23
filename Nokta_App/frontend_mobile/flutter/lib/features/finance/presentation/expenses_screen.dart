import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/constants.dart';
import '../../../core/design/app_spacing.dart';
import '../../../core/providers/resource_repository_provider.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/logout_action.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../core/widgets/shimmer_box.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../features/settings/providers/settings_provider.dart';
import '../../../l10n/app_localizations.dart';

class ExpensesScreen extends ConsumerStatefulWidget {
  const ExpensesScreen({super.key});

  @override
  ConsumerState<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends ConsumerState<ExpensesScreen> {
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    final lang = ref.read(settingsProvider).locale.languageCode;
    _future = ref.read(resourceRepositoryProvider).list(
          ApiPaths.expenses,
          params: {'limit': 100, 'lang': lang},
        );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = ref.watch(settingsProvider).locale.languageCode;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.navExpenses),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(child: StatusBadge(label: l10n.readOnlyLabel, tone: StatusTone.info)),
          ),
          const AppBarLogoutAction(),
        ],
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
                    return ListView(children: [Center(child: Text(l10n.errorGeneric))]);
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
                      return Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.md),
                        child: GlassCard(
                          child: ListTile(
                            title: Text(
                              readLocalizedText(item['title'] ?? item['category'] ?? ''),
                              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
                            ),
                            subtitle: Text('${item['category'] ?? ''} • ${item['date'] ?? ''}'),
                            trailing: Text(
                              formatCurrencyAfn((item['amount'] as num?) ?? 0, locale: locale),
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                            ),
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
