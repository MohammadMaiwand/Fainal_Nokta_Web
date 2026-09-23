import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/design/app_spacing.dart';
import '../../../core/design/app_text_styles.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/logout_action.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../core/widgets/shimmer_box.dart';
import '../../../l10n/app_localizations.dart';
import '../providers/family_providers.dart';

class FamilyHomeScreen extends ConsumerWidget {
  const FamilyHomeScreen({super.key});

  String _name(Map<String, dynamic> s) =>
      readLocalizedText(s['fullName'] ?? s['name'] ?? '${s['firstName'] ?? ''} ${s['lastName'] ?? ''}'.trim());

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final students = ref.watch(familyStudentsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.navFamily),
        actions: [
          IconButton(
            tooltip: l10n.pullToRefresh,
            onPressed: () => ref.invalidate(familyStudentsProvider),
            icon: const Icon(Icons.refresh),
          ),
          const AppBarLogoutAction(),
        ],
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async => ref.invalidate(familyStudentsProvider),
              child: students.when(
                loading: () => const ShimmerList(),
                error: (_, __) => ListView(
                  children: [
                    const SizedBox(height: 80),
                    Center(child: Text(l10n.errorGeneric)),
                  ],
                ),
                data: (list) {
                  if (list.isEmpty) {
                    return ListView(
                      children: [
                        const SizedBox(height: 48),
                        Icon(Icons.family_restroom, size: 64, color: Theme.of(context).colorScheme.primary),
                        const SizedBox(height: 16),
                        Center(child: Text(l10n.familyEmpty, style: AppTextStyles.body(context))),
                      ],
                    );
                  }
                  return ListView.builder(
                    padding: const EdgeInsets.all(AppSpacing.page),
                    itemCount: list.length,
                    itemBuilder: (_, i) {
                      final student = list[i];
                      final id = '${student['_id'] ?? student['id'] ?? ''}';
                      final selected = ref.watch(selectedStudentIdProvider) == id;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.md),
                        child: GlassCard(
                          child: ListTile(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            minVerticalPadding: AppSpacing.minTap / 2,
                            leading: CircleAvatar(
                              child: Text(_name(student).isNotEmpty ? _name(student)[0] : '?'),
                            ),
                            title: Text(_name(student), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                            subtitle: Text('${student['className'] ?? student['grade'] ?? ''}'),
                            trailing: selected
                                ? Icon(Icons.check_circle, color: Theme.of(context).colorScheme.primary)
                                : const Icon(Icons.chevron_right),
                            onTap: () {
                              ref.read(selectedStudentIdProvider.notifier).state = id;
                              context.push('/app/family/$id');
                            },
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
