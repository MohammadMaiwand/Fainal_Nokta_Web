import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../../l10n/app_localizations.dart';

/// Confirms logout, clears session, navigates to login.
Future<void> confirmAndLogout(BuildContext context, WidgetRef ref) async {
  final l10n = AppLocalizations.of(context)!;
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(l10n.logout),
      content: Text(l10n.logoutConfirm),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l10n.cancel)),
        FilledButton(
          onPressed: () => Navigator.pop(ctx, true),
          style: FilledButton.styleFrom(backgroundColor: Colors.red.shade700),
          child: Text(l10n.logout),
        ),
      ],
    ),
  );
  if (confirmed != true || !context.mounted) return;
  await ref.read(authProvider.notifier).logout();
  if (context.mounted) context.go('/login');
}

/// Logout icon for [AppBar.actions] — visible on all main screens.
class AppBarLogoutAction extends ConsumerWidget {
  const AppBarLogoutAction({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    return IconButton(
      icon: const Icon(Icons.logout_rounded),
      tooltip: l10n.logout,
      color: Colors.red.shade400,
      onPressed: () => confirmAndLogout(context, ref),
    );
  }
}

/// Full-width logout button for profile, dashboard, drawer.
class LogoutButton extends ConsumerWidget {
  const LogoutButton({super.key, this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    if (compact) {
      return ListTile(
        leading: Icon(Icons.logout_rounded, color: Colors.red.shade400),
        title: Text(l10n.logout, style: TextStyle(color: Colors.red.shade400, fontWeight: FontWeight.w700)),
        onTap: () => confirmAndLogout(context, ref),
      );
    }
    return OutlinedButton.icon(
      onPressed: () => confirmAndLogout(context, ref),
      icon: Icon(Icons.logout_rounded, color: Colors.red.shade700),
      label: Text(
        l10n.logout,
        style: TextStyle(color: Colors.red.shade700, fontWeight: FontWeight.w700),
      ),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        side: BorderSide(color: Colors.red.shade300, width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}
