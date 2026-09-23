import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/constants.dart';
import '../../../app/theme.dart';
import '../../../core/providers/repositories_provider.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../l10n/app_localizations.dart';

class ComposeMessageScreen extends ConsumerStatefulWidget {
  const ComposeMessageScreen({super.key});

  @override
  ConsumerState<ComposeMessageScreen> createState() => _ComposeMessageScreenState();
}

class _ComposeMessageScreenState extends ConsumerState<ComposeMessageScreen> {
  final _subjectController = TextEditingController();
  final _messageController = TextEditingController();
  String _target = 'teacher';
  bool _sending = false;

  @override
  void dispose() {
    _subjectController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_messageController.text.trim().isEmpty) return;
    setState(() => _sending = true);
    try {
      final user = ref.read(authProvider).user;
      final payload = <String, dynamic>{
        'subject': _subjectController.text.trim().isEmpty
            ? 'Mobile message'
            : _subjectController.text.trim(),
        'message': _messageController.text.trim(),
      };
      if (user?.isRole(AppRoles.student) == true) {
        if (_target == 'admin') {
          payload['targetGroup'] = 'admin';
          payload['recipientRole'] = 'admin';
        } else {
          payload['recipientRole'] = 'teacher';
        }
      }
      await ref.read(messagesRepositoryProvider).create(payload);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context)!.contactSuccess)),
      );
      context.pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final isStudent = user?.isRole(AppRoles.student) ?? false;

    return Scaffold(
      appBar: AppBar(title: const Text('New message')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (isStudent)
            GlassCard(
              child: SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'teacher', label: Text('My teacher'), icon: Icon(Icons.school)),
                  ButtonSegment(value: 'admin', label: Text('Admin'), icon: Icon(Icons.admin_panel_settings)),
                ],
                selected: {_target},
                onSelectionChanged: (value) => setState(() => _target = value.first),
              ),
            ),
          const SizedBox(height: 16),
          GlassCard(
            child: Column(
              children: [
                TextField(
                  controller: _subjectController,
                  decoration: const InputDecoration(
                    labelText: 'Subject',
                    prefixIcon: Icon(Icons.title),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _messageController,
                  maxLines: 6,
                  decoration: InputDecoration(
                    labelText: AppLocalizations.of(context)!.contactMessage,
                    prefixIcon: const Icon(Icons.message_outlined),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _sending ? null : _send,
            icon: const Icon(Icons.send_rounded),
            label: Text(AppLocalizations.of(context)!.sendMessage),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
          ),
        ],
      ),
    );
  }
}
