import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/constants.dart';
import '../../../app/theme.dart';
import '../../../core/auth/permission_service.dart';
import '../../../core/providers/repositories_provider.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/logout_action.dart';
import '../../../core/widgets/safe_network_image.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../l10n/app_localizations.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _phoneController = TextEditingController();
  final _imageController = TextEditingController();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _imageController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    super.dispose();
  }

  void _syncFromUser() {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    if (_phoneController.text.isEmpty) _phoneController.text = user.phone ?? '';
    if (_imageController.text.isEmpty) _imageController.text = user.profileImage ?? '';
  }

  Future<void> _saveProfile() async {
    final registry = ref.read(permissionServiceProvider).registry;
    final user = ref.read(authProvider).user;
    if (user == null) return;

    setState(() => _saving = true);
    try {
      final repo = ref.read(profileRepositoryProvider);
      if (registry.canEditProfilePhone(user) || registry.canEditProfilePhoto(user)) {
        await repo.updateProfile(
          phone: registry.canEditProfilePhone(user) ? _phoneController.text.trim() : null,
          profileImage: registry.canEditProfilePhoto(user) ? _imageController.text.trim() : null,
        );
      }
      await ref.read(authProvider.notifier).refreshProfile();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile updated')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _changePassword() async {
    if (_currentPasswordController.text.isEmpty || _newPasswordController.text.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter current password and a new password (min 8 chars).')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(profileRepositoryProvider).changePassword(
            currentPassword: _currentPasswordController.text,
            newPassword: _newPasswordController.text,
          );
      _currentPasswordController.clear();
      _newPasswordController.clear();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password changed successfully')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final user = ref.watch(authProvider).user;
    final registry = ref.watch(permissionServiceProvider).registry;
    if (user == null) return Center(child: Text(l10n.loading));
    _syncFromUser();

    final isStudent = user.isRole(AppRoles.student);
    final canEditPhone = registry.canEditProfilePhone(user);
    final canEditPhoto = registry.canEditProfilePhoto(user);
    final canChangePassword = registry.canChangePassword(user);
    final readOnly = isStudent;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.navProfile),
        actions: const [AppBarLogoutAction()],
      ),
      body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GlassCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SafeNetworkImage(url: user.profileImage, size: 80, fallbackIcon: Icons.person),
              const SizedBox(height: 16),
              Text(user.name, style: Theme.of(context).textTheme.headlineSmall),
              Text(user.email),
              Text('${l10n.navDashboard}: ${user.role}'),
              if (readOnly)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    'Name and student records are read-only on mobile.',
                    style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
                ),
            ],
          ),
        ),
        if (canEditPhoto) ...[
          const SizedBox(height: 16),
          GlassCard(
            child: TextFormField(
              controller: _imageController,
              decoration: const InputDecoration(
                labelText: 'Profile image URL',
                prefixIcon: Icon(Icons.image_outlined),
              ),
            ),
          ),
        ],
        if (canEditPhone) ...[
          const SizedBox(height: 16),
          GlassCard(
            child: TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Phone / WhatsApp',
                prefixIcon: Icon(Icons.phone_outlined),
              ),
            ),
          ),
        ],
        if (canEditPhone || canEditPhoto) ...[
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _saving ? null : _saveProfile,
            icon: const Icon(Icons.save_outlined),
            label: const Text('Save profile'),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              minimumSize: const Size.fromHeight(48),
            ),
          ),
        ],
        if (canChangePassword) ...[
          const SizedBox(height: 20),
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Change password', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _currentPasswordController,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Current password'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _newPasswordController,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'New password'),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: _saving ? null : _changePassword,
                  icon: const Icon(Icons.lock_reset),
                  label: const Text('Update password'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.secondary,
                    minimumSize: const Size.fromHeight(48),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 28),
        const LogoutButton(),
        const SizedBox(height: 24),
      ],
    ),
    );
  }
}
