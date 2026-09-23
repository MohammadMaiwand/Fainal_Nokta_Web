import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/constants.dart';
import '../../../app/theme.dart';
import '../../../core/api/api_client.dart';
import '../../../core/widgets/logout_action.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../features/settings/providers/settings_provider.dart';
import '../../../l10n/app_localizations.dart';

class TeacherEarningsScreen extends ConsumerStatefulWidget {
  const TeacherEarningsScreen({super.key});

  @override
  ConsumerState<TeacherEarningsScreen> createState() => _TeacherEarningsScreenState();
}

class _TeacherEarningsScreenState extends ConsumerState<TeacherEarningsScreen> {
  late Future<Map<String, dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _future = ref.read(apiClientProvider).get(ApiPaths.financeMeEarnings).then((response) {
      final data = ApiClient.unwrapData(response.data);
      return data is Map<String, dynamic> ? data : {};
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = ref.watch(settingsProvider).locale.languageCode;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My salary & tax'),
        actions: const [AppBarLogoutAction()],
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('${snapshot.error}'));
          }
          final data = snapshot.data ?? {};
          final overview = data['overview'] as Map<String, dynamic>? ?? {};
          final salaryRecords = (data['salaryRecords'] as List<dynamic>? ?? [])
              .cast<Map<String, dynamic>>();

          final gross = (overview['totalSalaryPayable'] as num?) ??
              (overview['commissionEarned'] as num?) ??
              0;
          final paid = (overview['paidSalaryAmount'] as num?) ?? 0;
          final unpaid = (overview['unpaidSalaryAmount'] as num?) ?? 0;
          final taxTotal = salaryRecords.fold<double>(
            0,
            (sum, row) => sum + ((row['taxAmount'] as num?)?.toDouble() ?? 0),
          );

          return RefreshIndicator(
            onRefresh: () async {
              setState(_reload);
              await _future;
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _StatCard(
                  label: 'Total payable',
                  value: formatCurrencyAfn(gross, locale: locale),
                  color: AppColors.primary,
                ),
                const SizedBox(height: 12),
                _StatCard(
                  label: 'Tax (from payroll records)',
                  value: formatCurrencyAfn(taxTotal, locale: locale),
                  color: AppColors.warning,
                ),
                const SizedBox(height: 12),
                _StatCard(
                  label: 'Paid',
                  value: formatCurrencyAfn(paid, locale: locale),
                  color: AppColors.success,
                ),
                const SizedBox(height: 12),
                _StatCard(
                  label: 'Unpaid balance',
                  value: formatCurrencyAfn(unpaid, locale: locale),
                  color: AppColors.danger,
                ),
                const SizedBox(height: 20),
                Text('Recent payroll', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                if (salaryRecords.isEmpty)
                  Text(l10n.emptyState)
                else
                  ...salaryRecords.take(10).map((row) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: GlassCard(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              formatCurrencyAfn(
                                (row['grossSalary'] as num?) ?? (row['amount'] as num?) ?? 0,
                                locale: locale,
                              ),
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
                            ),
                            if (row['taxAmount'] != null)
                              Text('Tax: ${formatCurrencyAfn((row['taxAmount'] as num?) ?? 0, locale: locale)}'),
                            if (row['netSalary'] != null)
                              Text('Net: ${formatCurrencyAfn((row['netSalary'] as num?) ?? 0, locale: locale)}'),
                            if (row['taxCategory'] != null) Text('${row['taxCategory']}'),
                          ],
                        ),
                      ),
                    );
                  }),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value, required this.color});

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(Icons.payments, color: color),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: Theme.of(context).textTheme.bodySmall),
                Text(value, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
