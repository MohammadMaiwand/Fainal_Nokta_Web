import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

/// Network image with graceful fallback when URL is missing or fails.
class SafeNetworkImage extends StatelessWidget {
  const SafeNetworkImage({
    super.key,
    this.url,
    this.size = 48,
    this.fallbackIcon = Icons.person,
  });

  final String? url;
  final double size;
  final IconData fallbackIcon;

  @override
  Widget build(BuildContext context) {
    final resolved = url?.trim();
    if (resolved == null || resolved.isEmpty) {
      return _fallback(context);
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(size / 2),
      child: CachedNetworkImage(
        imageUrl: resolved,
        width: size,
        height: size,
        fit: BoxFit.cover,
        memCacheWidth: (size * 2).toInt(),
        errorWidget: (_, __, ___) => _fallback(context),
        placeholder: (_, __) => SizedBox(
          width: size,
          height: size,
          child: Center(
            child: SizedBox(
              width: size * 0.4,
              height: size * 0.4,
              child: const CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
        ),
      ),
    );
  }

  Widget _fallback(BuildContext context) {
    return CircleAvatar(
      radius: size / 2,
      backgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.12),
      child: Icon(fallbackIcon, size: size * 0.5),
    );
  }
}
