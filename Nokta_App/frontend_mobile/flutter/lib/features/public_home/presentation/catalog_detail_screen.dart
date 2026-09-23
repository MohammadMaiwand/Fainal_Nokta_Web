import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/nokta_logo.dart';
import '../../../l10n/app_localizations.dart';

class CatalogDetailScreen extends StatelessWidget {
  const CatalogDetailScreen({super.key, required this.offering});

  final Map<String, dynamic> offering;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final title = '${offering['titleText'] ?? offering['title'] ?? offering['className'] ?? 'Offering'}';
    final description = '${offering['descriptionText'] ?? offering['description'] ?? offering['shortDescription'] ?? ''}';
    final fee = (offering['fee'] as num?) ?? (offering['price'] as num?) ?? 0;

    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Center(child: NoktaLogo(size: 64)),
          const SizedBox(height: 12),
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 8),
                Text(description),
                const SizedBox(height: 12),
                Text('Fee: ${formatCurrencyAfn(fee)}'),
                if (offering['teacherName'] != null) Text('Teacher: ${offering['teacherName']}'),
                if (offering['className'] != null) Text('Class: ${offering['className']}'),
              ],
            ),
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: () {
              final catalogType = '${offering['catalogType'] ?? 'class'}';
              context.push('/register', extra: {
                'classId': offering['classId'] ?? (catalogType == 'class' ? offering['_id'] : ''),
                'subjectId': offering['subjectId'] ?? '',
                'teacherId': offering['teacherId'] ?? '',
                'titleText': title,
                'catalogType': catalogType,
              });
            },
            icon: const Icon(Icons.app_registration),
            label: const Text('Register & pay'),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => context.go('/'),
            icon: const Icon(Icons.arrow_back),
            label: Text(l10n.navHome),
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          ),
        ],
      ),
    );
  }
}
