import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../app/theme.dart';

enum AppErrorType {
  network,
  permission,
  empty,
  backend,
  sessionExpired,
  validation,
  offlineBlocked,
}

class AppErrorView extends StatelessWidget {
  const AppErrorView({
    super.key,
    required this.type,
    this.message,
    this.onRetry,
  });

  final AppErrorType type;
  final String? message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final (icon, title, color) = switch (type) {
      AppErrorType.network => (
          Icons.wifi_off_rounded,
          l10n.errorNetwork,
          AppColors.warning,
        ),
      AppErrorType.permission => (
          Icons.lock_outline,
          l10n.errorPermission,
          AppColors.danger,
        ),
      AppErrorType.empty => (
          Icons.inbox_outlined,
          l10n.emptyState,
          Theme.of(context).colorScheme.primary,
        ),
      AppErrorType.backend => (
          Icons.cloud_off_outlined,
          l10n.errorBackend,
          AppColors.danger,
        ),
      AppErrorType.sessionExpired => (
          Icons.logout,
          l10n.errorSessionExpired,
          AppColors.danger,
        ),
      AppErrorType.validation => (
          Icons.error_outline,
          l10n.errorValidation,
          AppColors.warning,
        ),
      AppErrorType.offlineBlocked => (
          Icons.cloud_off,
          l10n.errorOfflineBlocked,
          AppColors.warning,
        ),
    };

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: color.withValues(alpha: 0.85)),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            if (message != null && message!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(message!, textAlign: TextAlign.center),
            ],
            if (onRetry != null) ...[
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: Text(l10n.pullToRefresh),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class CachedDataBanner extends StatelessWidget {
  const CachedDataBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Material(
      color: AppColors.secondary.withValues(alpha: 0.15),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              const Icon(Icons.history, size: 18, color: AppColors.secondary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  l10n.offlineCachedBanner,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class PermissionDeniedScreen extends StatelessWidget {
  const PermissionDeniedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: AppErrorView(
        type: AppErrorType.permission,
        onRetry: () => Navigator.of(context).maybePop(),
      ),
    );
  }
}
