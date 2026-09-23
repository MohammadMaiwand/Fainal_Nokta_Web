import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../../app/env_config.dart';
import '../../../core/design/app_spacing.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../l10n/app_localizations.dart';

class AboutScreen extends StatefulWidget {
  const AboutScreen({super.key});

  @override
  State<AboutScreen> createState() => _AboutScreenState();
}

class _AboutScreenState extends State<AboutScreen> {
  PackageInfo? _info;

  @override
  void initState() {
    super.initState();
    PackageInfo.fromPlatform().then((info) {
      if (mounted) setState(() => _info = info);
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final version = _info?.version ?? '—';
    final build = _info?.buildNumber ?? '—';

    return Scaffold(
      appBar: AppBar(title: Text(l10n.aboutTitle)),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.page),
        children: [
          const SizedBox(height: 12),
          Icon(Icons.school_rounded, size: 72, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 16),
          Text(
            l10n.appTitle,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Text(
            '${l10n.aboutVersion} $version ($build)',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16),
          ),
          const SizedBox(height: 24),
          GlassCard(
            child: Column(
              children: [
                _AboutRow(label: l10n.devEnvironment, value: EnvConfig.environmentLabel),
                const Divider(height: 1),
                _AboutRow(
                  label: l10n.aboutApiHost,
                  value: _displayHost(EnvConfig.apiBaseUrl),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            l10n.aboutSupport,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontSize: 16, height: 1.5),
          ),
          const SizedBox(height: 8),
          Text(
            l10n.aboutSupportHint,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }

  String _displayHost(String url) {
    try {
      return Uri.parse(url).host;
    } catch (_) {
      return url;
    }
  }
}

class _AboutRow extends StatelessWidget {
  const _AboutRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
      child: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600))),
          Flexible(child: Text(value, textAlign: TextAlign.end)),
        ],
      ),
    );
  }
}
