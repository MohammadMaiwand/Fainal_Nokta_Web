import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/api_url_resolver.dart';
import '../../../app/env_config.dart';
import '../../../app/theme.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/network/network_status.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/nokta_logo.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../l10n/app_localizations.dart';
import '../constants/demo_accounts.dart';
import '../models/login_result.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscure = true;
  bool _rememberMe = true;
  DemoRole? _selectedRole;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _onRoleChanged(DemoRole? role) {
    setState(() => _selectedRole = role);
    if (role != null) {
      _emailController.text = role.email;
      _passwordController.text = role.password;
    }
  }

  String _friendlyLoginError(String message) {
    final lower = message.toLowerCase();
    if (lower.contains('temporarily locked') || lower.contains('failed login')) {
      return 'Account is temporarily locked after too many failed attempts. Wait 30 minutes or ask an admin to unlock the account.';
    }
    if (lower.contains('registration has expired') || lower.contains('blocked')) {
      return 'This student account is blocked or registration has expired. Contact the academy office.';
    }
    if (lower.contains('invalid credentials')) {
      return 'Email or password is incorrect.';
    }
    if (lower.contains('connection') ||
        lower.contains('network') ||
        lower.contains('timed out') ||
        lower.contains('socket')) {
      return 'Cannot reach the server. Run the dev stack (backend + web on port '
          '${ApiUrlResolver.devWebPort}) and try again.';
    }
    return message;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final online = ref.read(networkOnlineProvider).value ?? true;
    if (!online) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context)!.offlineBanner)),
      );
      return;
    }
    try {
      final result = await ref.read(authProvider.notifier).login(
            email: _emailController.text.trim(),
            password: _passwordController.text,
            rememberMe: _rememberMe,
            expectedRole: _selectedRole?.key,
          );
      if (!mounted) return;
      switch (result) {
        case LoginTwoFactorRequired(:final email):
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(AppLocalizations.of(context)!.loginTwoFactorRequired)),
          );
          context.push('/login/2fa?email=${Uri.encodeComponent(email)}');
        case LoginSuccess():
          context.go('/app/dashboard');
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_friendlyLoginError(e.message))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final auth = ref.watch(authProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 440),
                    child: GlassCard(
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Center(child: NoktaLogo(size: 64)),
                            const SizedBox(height: 16),
                            Text(
                              l10n.loginTitle,
                              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Sign in with the email and password from your academy account (web or mobile).',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                                  ),
                            ),
                            if (EnvConfig.isDevelopment) ...[
                              const SizedBox(height: 16),
                              DropdownButtonFormField<DemoRole>(
                                value: _selectedRole,
                                decoration: InputDecoration(
                                  labelText: l10n.selectRole,
                                ),
                                hint: Text(l10n.chooseRole),
                                items: [
                                  for (final role in DemoAccounts.roles)
                                    DropdownMenuItem(
                                      value: role,
                                      child: Text(role.labelEn()),
                                    ),
                                ],
                                onChanged: _onRoleChanged,
                              ),
                              Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Text(
                                  l10n.loginRoleHelp,
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                                      ),
                                ),
                              ),
                            ],
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              autofillHints: const [AutofillHints.username],
                              decoration: InputDecoration(labelText: l10n.email),
                              validator: (v) {
                                if (v == null || !v.contains('@')) {
                                  return l10n.errorGeneric;
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _passwordController,
                              obscureText: _obscure,
                              autofillHints: const [AutofillHints.password],
                              decoration: InputDecoration(
                                labelText: l10n.password,
                                suffixIcon: IconButton(
                                  icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off),
                                  onPressed: () => setState(() => _obscure = !_obscure),
                                ),
                              ),
                              validator: (v) =>
                                  (v == null || v.length < 4) ? l10n.errorGeneric : null,
                            ),
                            const SizedBox(height: 8),
                            CheckboxListTile(
                              value: _rememberMe,
                              onChanged: (v) => setState(() => _rememberMe = v ?? true),
                              title: Text(l10n.rememberMe),
                              contentPadding: EdgeInsets.zero,
                              controlAffinity: ListTileControlAffinity.leading,
                            ),
                            const SizedBox(height: 16),
                            FilledButton.icon(
                              onPressed: auth.isLoading ? null : _submit,
                              icon: auth.isLoading
                                  ? const SizedBox(
                                      height: 18,
                                      width: 18,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    )
                                  : const Icon(Icons.login_rounded),
                              label: Text(l10n.loginButton),
                              style: FilledButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                              ),
                            ),
                            if (auth.errorMessage != null) ...[
                              const SizedBox(height: 12),
                              Text(
                                auth.errorMessage == '__session_expired__'
                                    ? l10n.errorSessionExpired
                                    : _friendlyLoginError(auth.errorMessage!),
                                style: const TextStyle(color: AppColors.danger),
                              ),
                            ],
                            TextButton(
                              onPressed: () => context.go('/register'),
                              child: const Text('New student? Register here'),
                            ),
                            TextButton(
                              onPressed: () => context.go('/'),
                              child: Text(l10n.navHome),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
    );
  }
}
