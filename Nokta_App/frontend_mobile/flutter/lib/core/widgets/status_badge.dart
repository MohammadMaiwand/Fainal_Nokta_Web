import 'package:flutter/material.dart';

import '../../app/theme.dart';
import '../design/app_radius.dart';

class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.label, this.tone = StatusTone.neutral});

  final String label;
  final StatusTone tone;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (tone) {
      StatusTone.success => (AppColors.success.withValues(alpha: 0.15), AppColors.success),
      StatusTone.warning => (AppColors.warning.withValues(alpha: 0.15), AppColors.warning),
      StatusTone.danger => (AppColors.danger.withValues(alpha: 0.15), AppColors.danger),
      StatusTone.info => (AppColors.secondary.withValues(alpha: 0.15), AppColors.secondary),
      StatusTone.neutral => (Colors.grey.withValues(alpha: 0.15), Colors.grey.shade700),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(AppRadius.chip)),
      child: Text(
        label,
        style: TextStyle(color: fg, fontSize: 13, fontWeight: FontWeight.w700),
      ),
    );
  }
}

enum StatusTone { success, warning, danger, info, neutral }
