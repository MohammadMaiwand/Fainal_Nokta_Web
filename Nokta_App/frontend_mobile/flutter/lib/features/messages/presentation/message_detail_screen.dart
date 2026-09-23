import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/auth/permission_service.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../core/network/network_status.dart';
import '../../../core/providers/repositories_provider.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_error_views.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../l10n/app_localizations.dart';

class MessageDetailScreen extends ConsumerStatefulWidget {
  const MessageDetailScreen({super.key, required this.id});
  final String id;

  @override
  ConsumerState<MessageDetailScreen> createState() => _MessageDetailScreenState();
}

class _MessageDetailScreenState extends ConsumerState<MessageDetailScreen> {
  final _replyController = TextEditingController();
  late Future<Map<String, dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = ref.read(messagesRepositoryProvider).getById(widget.id).then((msg) async {
      if (msg['status'] == 'unread') {
        try {
          await ref.read(messagesRepositoryProvider).markRead(widget.id);
        } catch (_) {}
      }
      return msg;
    });
  }

  @override
  void dispose() {
    _replyController.dispose();
    super.dispose();
  }

  Future<void> _reply() async {
    final l10n = AppLocalizations.of(context)!;
    final online = ref.read(networkOnlineProvider).value ?? true;
    if (!online) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.errorOfflineBlocked)));
      return;
    }
    if (!ref.read(permissionServiceProvider).registry.canReplyMessages(ref.read(authProvider).user)) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.errorPermission)));
      return;
    }
    final text = _replyController.text.trim();
    if (text.isEmpty) return;
    try {
      await ref.read(messagesRepositoryProvider).reply(widget.id, text);
      _replyController.clear();
      setState(_load);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l10n.sendMessage)));
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final canReply = ref.watch(permissionServiceProvider).registry.canReplyMessages(ref.watch(authProvider).user);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.messagesDetail)),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return AppErrorView(type: AppErrorType.backend, onRetry: () => setState(_load));
          }
          final msg = snapshot.data ?? {};
          return Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: GlassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          readLocalizedText(msg['subject'] ?? ''),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 8),
                        Text('${msg['senderName'] ?? ''} • ${msg['status'] ?? ''}'),
                        const Divider(height: 24),
                        Text(readLocalizedText(msg['body'] ?? msg['message'] ?? '')),
                      ],
                    ),
                  ),
                ),
              ),
              if (canReply)
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _replyController,
                            maxLines: 3,
                            decoration: InputDecoration(hintText: l10n.messagesReply),
                          ),
                        ),
                        IconButton.filled(
                          onPressed: _reply,
                          icon: const Icon(Icons.send),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
