import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/logout_action.dart';
import '../../../l10n/app_localizations.dart';
import '../providers/settings_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final settings = ref.watch(settingsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.navSettings),
        actions: const [AppBarLogoutAction()],
      ),
      body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ListTile(
          title: Text(l10n.language),
          subtitle: Text(settings.locale.languageCode.toUpperCase()),
        ),
        Wrap(
          spacing: 8,
          children: [
            ChoiceChip(
              label: const Text('EN'),
              selected: settings.locale.languageCode == 'en',
              onSelected: (_) => ref.read(settingsProvider.notifier).setLocale(const Locale('en')),
            ),
            ChoiceChip(
              label: const Text('FA'),
              selected: settings.locale.languageCode == 'fa',
              onSelected: (_) => ref.read(settingsProvider.notifier).setLocale(const Locale('fa')),
            ),
            ChoiceChip(
              label: const Text('PS'),
              selected: settings.locale.languageCode == 'ps',
              onSelected: (_) => ref.read(settingsProvider.notifier).setLocale(const Locale('ps')),
            ),
          ],
        ),
        const Divider(height: 32),
        ListTile(title: Text(l10n.theme)),
        SegmentedButton<ThemeMode>(
          segments: [
            ButtonSegment(value: ThemeMode.light, label: Text(l10n.themeLight)),
            ButtonSegment(value: ThemeMode.dark, label: Text(l10n.themeDark)),
            ButtonSegment(value: ThemeMode.system, label: Text(l10n.themeSystem)),
          ],
          selected: {settings.themeMode},
          onSelectionChanged: (value) =>
              ref.read(settingsProvider.notifier).setThemeMode(value.first),
        ),
        const Divider(height: 32),
        ListTile(
          leading: const Icon(Icons.info_outline),
          title: Text(l10n.aboutTitle),
          onTap: () => context.push('/app/about'),
        ),
        const Divider(height: 32),
        const LogoutButton(),
      ],
    ),
    );
  }
}
