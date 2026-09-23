import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Brand mark shared with the Nokta web app (`academy-logo.svg`).
class NoktaLogo extends StatelessWidget {
  const NoktaLogo({super.key, this.size = 56, this.showLabel = false});

  final double size;
  final bool showLabel;

  static const _assetPath = 'assets/images/academy-logo.svg';

  @override
  Widget build(BuildContext context) {
    final children = <Widget>[
      ClipRRect(
        borderRadius: BorderRadius.circular(size * 0.28),
        child: SvgPicture.asset(
          _assetPath,
          width: size,
          height: size,
          fit: BoxFit.contain,
        ),
      ),
    ];
    if (showLabel) {
      children.addAll([
        const SizedBox(width: 12),
        Text(
          'Nokta Academy',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
              ),
        ),
      ]);
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: children,
    );
  }
}
