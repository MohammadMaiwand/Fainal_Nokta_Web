import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/env_config.dart';
import '../../../core/cache/offline_cache_service.dart';
import '../../../core/design/app_spacing.dart';
import '../../../core/network/network_status.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../features/settings/providers/settings_provider.dart';
import '../../../l10n/app_localizations.dart';

class DevReadinessScreen extends ConsumerStatefulWidget {
  const DevReadinessScreen({super.key});

  @override
  ConsumerState<DevReadinessScreen> createState() => _DevReadinessScreenState();
}

class _DevReadinessScreenState extends ConsumerState<DevReadinessScreen> {
  bool? _backendReachable;
  int _cacheEntries = 0;

  @override
  void initState() {
    super.initState();
    _probe();
  }

  Future<void> _probe() async {
    final online = ref.read(networkOnlineProvider).value ?? false;
    final count = await ref.read(offlineCacheServiceProvider).entryCount();
    if (mounted) {
      setState(() {
        _backendReachable = online;
        _cacheEntries = count;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!EnvConfig.isDevelopment) {
      return const Scaffold(body: Center(child: Text('Not available')));
    }

    final auth = ref.watch(authProvider);
    final settings = ref.watch(settingsProvider);
    final user = auth.user;
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.devReadinessTitle)),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.page),
        children: [
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _row(l10n.devApiBase, EnvConfig.apiBaseUrl),
                _row(l10n.devEnvironment, EnvConfig.environment),
                _row(l10n.devBackendReachable, '$_backendReachable'),
                _row(l10n.devAuthStatus, auth.status.name),
                _row(l10n.devCurrentRole, user?.role ?? '—'),
                _row(l10n.devPermissionCount, '${user?.permissionKeys.length ?? 0}'),
                _row(l10n.devCacheStatus, '$_cacheEntries entries'),
                _row(l10n.devLocale, settings.locale.languageCode),
                _row(l10n.devTextDirection, Directionality.of(context).toString()),
                _row(l10n.theme, settings.themeMode.name),
              ],
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(onPressed: _probe, child: Text(l10n.pullToRefresh)),
        ],
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(flex: 2, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600))),
          Expanded(flex: 3, child: Text(value)),
        ],
      ),
    );
  }
}
