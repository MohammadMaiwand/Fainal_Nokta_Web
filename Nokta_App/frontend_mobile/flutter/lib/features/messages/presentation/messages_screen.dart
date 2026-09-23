import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/cache/offline_cache_service.dart';
import '../../../core/providers/repositories_provider.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_error_views.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../core/widgets/logout_action.dart';
import '../../../core/widgets/route_guard.dart';
import '../../../core/auth/permission_service.dart';
import '../../../core/permissions/mobile_permission_registry.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../l10n/app_localizations.dart';

class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  late Future<List<Map<String, dynamic>>> _inboxFuture;
  late Future<List<Map<String, dynamic>>> _sentFuture;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _reload();
  }

  void _reload() {
    final repo = ref.read(messagesRepositoryProvider);
    _inboxFuture = repo.inbox(params: const {'limit': 50});
    _sentFuture = repo.sent(params: const {'limit': 50});
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final showCached = ref.watch(showingCachedDataProvider);
    final canCompose = ref.watch(permissionServiceProvider).registry.canComposeMessages(
          ref.watch(authProvider).user,
        );
    return RouteGuard(
      route: MobileRoute.messages,
      child: Scaffold(
        floatingActionButton: canCompose
            ? FloatingActionButton.extended(
                onPressed: () => context.push('/app/messages/compose'),
                icon: const Icon(Icons.edit),
                label: const Text('New'),
              )
            : null,
        appBar: AppBar(
          title: Text(l10n.navMessages),
          actions: const [AppBarLogoutAction()],
          bottom: TabBar(
            controller: _tabs,
            tabs: [
              Tab(text: l10n.messagesInbox),
              Tab(text: l10n.messagesSent),
            ],
          ),
        ),
        body: Column(
          children: [
            const OfflineBanner(),
            if (showCached) const CachedDataBanner(),
            Expanded(
              child: TabBarView(
                controller: _tabs,
                children: [
                  _MessageList(
                    future: _inboxFuture,
                    onOpen: (id) => context.push('/app/messages/$id'),
                    onRefresh: () async {
                      setState(_reload);
                      await _inboxFuture;
                    },
                  ),
                  _MessageList(
                    future: _sentFuture,
                    onOpen: (id) => context.push('/app/messages/$id'),
                    onRefresh: () async {
                      setState(_reload);
                      await _sentFuture;
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MessageList extends StatelessWidget {
  const _MessageList({
    required this.future,
    required this.onOpen,
    required this.onRefresh,
  });

  final Future<List<Map<String, dynamic>>> future;
  final void Function(String id) onOpen;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: FutureBuilder<List<Map<String, dynamic>>>(
        future: future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return ListView(children: const [SizedBox(height: 120), Center(child: CircularProgressIndicator())]);
          }
          if (snapshot.hasError) {
            final err = snapshot.error;
            if (err is ApiException && err.isPermissionDenied) {
              return const AppErrorView(type: AppErrorType.permission);
            }
            return AppErrorView(type: AppErrorType.backend, onRetry: () => onRefresh());
          }
          final items = snapshot.data ?? [];
          if (items.isEmpty) return AppErrorView(type: AppErrorType.empty, message: l10n.emptyState);
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            itemBuilder: (_, i) {
              final item = items[i];
              final id = '${item['_id']}';
              final unread = item['status'] == 'unread';
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: GlassCard(
                  onTap: () => onOpen(id),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: unread ? Theme.of(context).colorScheme.primary : null,
                      child: Icon(unread ? Icons.mark_email_unread : Icons.mail_outline, color: unread ? Colors.white : null),
                    ),
                    title: Text(
                      readLocalizedText(item['subject'] ?? item['body']),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontWeight: unread ? FontWeight.w700 : FontWeight.normal),
                    ),
                    subtitle: Text('${item['senderName'] ?? ''}'),
                    trailing: const Icon(Icons.chevron_right),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
