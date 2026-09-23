import 'package:flutter/material.dart';

abstract final class AppShadows {
  static List<BoxShadow> card(bool isDark) => [
        BoxShadow(
          color: Colors.black.withValues(alpha: isDark ? 0.28 : 0.07),
          blurRadius: 24,
          offset: const Offset(0, 10),
        ),
      ];
}
