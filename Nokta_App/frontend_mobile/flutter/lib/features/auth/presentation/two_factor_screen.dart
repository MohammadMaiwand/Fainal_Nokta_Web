import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/design/app_spacing.dart';
import '../../../core/network/network_status.dart';
import '../../../core/widgets/app_primary_button.dart';
import '../../../core/widgets/app_snackbar.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../l10n/app_localizations.dart';
import '../providers/auth_provider.dart';

class TwoFactorScreen extends ConsumerStatefulWidget {
  const TwoFactorScreen({super.key, required this.email, this.rememberMe = true});

  final String email;
  final bool rememberMe;

  @override
  ConsumerState<TwoFactorScreen> createState() => _TwoFactorScreenState();
}

class _TwoFactorScreenState extends ConsumerState<TwoFactorScreen> {
  final _formKey = GlobalKey<FormState>();
  final _codeController = TextEditingController();

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final online = ref.read(networkOnlineProvider).value ?? true;
    if (!online) {
      AppSnackbar.showError(context, AppLocalizations.of(context)!.offlineBanner);
      return;
    }
    try {
      await ref.read(authProvider.notifier).verifyTwoFactor(
            email: widget.email,
            code: _codeController.text.trim(),
            rememberMe: widget.rememberMe,
          );
      await HapticFeedback.mediumImpact();
      if (mounted) context.go('/app/dashboard');
    } on ApiException catch (e) {
      if (!mounted) return;
      AppSnackbar.showError(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final auth = ref.watch(authProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      appBar: AppBar(title: Text(l10n.twoFactorTitle)),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.page),
                child: GlassCard(
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          l10n.twoFactorSubtitle,
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontSize: 16),
                        ),
                        const SizedBox(height: 8),
                        Text(widget.email, style: const TextStyle(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 24),
                        TextFormField(
                          controller: _codeController,
                          keyboardType: TextInputType.number,
                          textInputAction: TextInputAction.done,
                          maxLength: 8,
                          decoration: InputDecoration(
                            labelText: l10n.twoFactorCode,
                            counterText: '',
                          ),
                          validator: (v) =>
                              (v == null || v.trim().length < 4) ? l10n.errorValidation : null,
                          onFieldSubmitted: (_) => _submit(),
                        ),
                        const SizedBox(height: 24),
                        AppPrimaryButton(
                          label: l10n.twoFactorVerify,
                          isLoading: auth.isLoading,
                          onPressed: _submit,
                        ),
                        TextButton(
                          onPressed: () => context.go('/login'),
                          child: Text(l10n.twoFactorBack),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
