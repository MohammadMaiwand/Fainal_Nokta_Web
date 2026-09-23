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
import '../../../features/family/providers/family_providers.dart';
import '../../../features/settings/providers/settings_provider.dart';
import '../../../l10n/app_localizations.dart';

class PaymentsScreen extends ConsumerStatefulWidget {
  const PaymentsScreen({super.key});

  @override
  ConsumerState<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends ConsumerState<PaymentsScreen> {
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    final user = ref.read(authProvider).user;
    final studentId = ref.read(selectedStudentIdProvider);
    _future = ref.read(paymentsRepositoryProvider).list(
          user: user,
          params: studentId != null ? {'studentId': studentId} : null,
        );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = ref.watch(settingsProvider).locale.languageCode;
    final showCached = ref.watch(showingCachedDataProvider);

    return RouteGuard(
      route: MobileRoute.payments,
      child: Scaffold(
        appBar: AppBar(
          title: Text(l10n.navPayments),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Center(
                child: Text(
                  l10n.paymentsReadOnly,
                  style: Theme.of(context).textTheme.labelSmall,
                ),
              ),
            ),
            const AppBarLogoutAction(),
          ],
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
                    if (items.isEmpty) {
                      return AppErrorView(type: AppErrorType.empty, message: l10n.emptyState);
                    }

                    num totalPaid = 0;
                    num pending = 0;
                    for (final p in items) {
                      final amount = (p['netAmount'] as num?) ?? (p['amount'] as num?) ?? 0;
                      totalPaid += amount;
                      final rem = (p['remainingBalance'] as num?) ?? 0;
                      if (rem > 0) pending += rem;
                    }

                    return ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: GlassCard(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(l10n.paymentsTotalPaid),
                                    Text(
                                      formatCurrencyAfn(totalPaid, locale: locale),
                                      style: const TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.success,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: GlassCard(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(l10n.paymentsPending),
                                    Text(
                                      formatCurrencyAfn(pending, locale: locale),
                                      style: const TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.w800,
                                        color: AppColors.warning,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Text(l10n.paymentsRecent, style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 8),
                        ...items.map((p) => _PaymentCard(payment: p, locale: locale)),
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

class _PaymentCard extends StatelessWidget {
  const _PaymentCard({required this.payment, required this.locale});
  final Map<String, dynamic> payment;
  final String locale;

  @override
  Widget build(BuildContext context) {
    final amount = (payment['netAmount'] as num?) ?? (payment['amount'] as num?) ?? 0;
    final status = '${payment['status'] ?? payment['paymentStatus'] ?? 'paid'}';
    final color = switch (status.toLowerCase()) {
      'pending' || 'unpaid' => AppColors.warning,
      'failed' => AppColors.danger,
      _ => AppColors.success,
    };
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          title: Text(
            readLocalizedText(payment['studentName'] ?? payment['paymentFor'] ?? ''),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          subtitle: Text(
            '${formatDisplayDate(DateTime.tryParse('${payment['paymentDate']}'), useJalali: locale.startsWith('fa') || locale.startsWith('ps'))} • ${payment['method'] ?? ''}',
          ),
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                formatCurrencyAfn(amount, locale: locale),
                style: TextStyle(fontWeight: FontWeight.w700, color: color),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(status, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
