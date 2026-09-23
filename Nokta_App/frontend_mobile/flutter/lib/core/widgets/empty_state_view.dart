import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';

/// Consistent empty state with icon and message.
class EmptyStateView extends StatelessWidget {
  const EmptyStateView({
    super.key,
    this.message,
    this.icon = Icons.inbox_outlined,
  });

  final String? message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 64, color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.7)),
            const SizedBox(height: 16),
            Text(
              message ?? l10n.emptyState,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 17, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}
