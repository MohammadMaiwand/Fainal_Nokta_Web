import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/design/app_spacing.dart';
import '../../../core/providers/repositories_provider.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_error_views.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/nokta_logo.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../core/widgets/shimmer_box.dart';
import '../../../features/settings/providers/settings_provider.dart';
import '../../../l10n/app_localizations.dart';
import '../data/public_fallback_data.dart';
import '../data/public_repository.dart';

class PublicHomeData {
  const PublicHomeData({
    required this.classes,
    required this.courses,
    required this.announcements,
    this.usingFallback = false,
  });

  final List<Map<String, dynamic>> classes;
  final List<Map<String, dynamic>> courses;
  final List<Map<String, dynamic>> announcements;
  final bool usingFallback;
}

final publicHomeDataProvider = FutureProvider.autoDispose<PublicHomeData>((ref) async {
  final repo = ref.watch(publicRepositoryProvider);
  final lang = ref.watch(settingsProvider).locale.languageCode;

  Future<List<Map<String, dynamic>>> loadClasses() async {
    final raw = await repo.fetchClasses(lang: lang);
    return raw
        .map((e) => PublicRepository.normalizeOffering(e, language: lang, catalogType: 'class'))
        .where((e) => e['registrationOpen'] != false)
        .toList();
  }

  Future<List<Map<String, dynamic>>> loadCourses() async {
    final raw = await repo.fetchCourses(lang: lang);
    return raw
        .map((e) => PublicRepository.normalizeOffering(e, language: lang, catalogType: 'course'))
        .toList();
  }

  try {
    final results = await Future.wait<List<Map<String, dynamic>>>([
      loadClasses(),
      loadCourses(),
      repo.fetchAnnouncements(),
    ]);
    return PublicHomeData(
      classes: results[0],
      courses: results[1],
      announcements: results[2],
    );
  } catch (_) {
    return PublicHomeData(
      classes: PublicFallbackData.classes(lang),
      courses: PublicFallbackData.courses(lang),
      announcements: PublicFallbackData.announcements(lang),
      usingFallback: true,
    );
  }
});

class PublicHomeScreen extends ConsumerStatefulWidget {
  const PublicHomeScreen({super.key});

  @override
  ConsumerState<PublicHomeScreen> createState() => _PublicHomeScreenState();
}

class _PublicHomeScreenState extends ConsumerState<PublicHomeScreen> {
  final _contactName = TextEditingController();
  final _contactEmail = TextEditingController();
  final _contactMessage = TextEditingController();
  final _scrollController = ScrollController();
  final _classesKey = GlobalKey();
  bool _sendingContact = false;

  @override
  void dispose() {
    _contactName.dispose();
    _contactEmail.dispose();
    _contactMessage.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    ref.invalidate(publicHomeDataProvider);
    await ref.read(publicHomeDataProvider.future);
  }

  void _scrollToClasses() {
    final ctx = _classesKey.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 400), curve: Curves.easeOut);
    }
  }

  Future<void> _sendContact() async {
    final l10n = AppLocalizations.of(context)!;
    if (_contactName.text.trim().isEmpty || _contactMessage.text.trim().isEmpty) return;
    setState(() => _sendingContact = true);
    try {
      await ref.read(publicRepositoryProvider).sendContact(
            name: _contactName.text.trim(),
            email: _contactEmail.text.trim(),
            message: _contactMessage.text.trim(),
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.contactSuccess)),
      );
      _contactMessage.clear();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message)),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.errorGeneric)),
      );
    } finally {
      if (mounted) setState(() => _sendingContact = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final homeAsync = ref.watch(publicHomeDataProvider);

    return Scaffold(
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadData,
              child: CustomScrollView(
                controller: _scrollController,
                slivers: [
                  SliverAppBar(
                    pinned: true,
                    expandedHeight: 200,
                    flexibleSpace: FlexibleSpaceBar(
                      title: Text(l10n.publicHeroTitle),
                      background: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              AppColors.primary,
                              if (isDark) AppColors.backgroundDark else AppColors.secondary,
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        child: Center(
                          child: NoktaLogo(size: 88),
                        ),
                      ),
                    ),
                    actions: [
                      IconButton(
                        icon: Icon(isDark ? Icons.light_mode : Icons.dark_mode),
                        onPressed: () {
                          ref.read(settingsProvider.notifier).setThemeMode(
                                isDark ? ThemeMode.light : ThemeMode.dark,
                              );
                        },
                      ),
                      PopupMenuButton<Locale>(
                        icon: const Icon(Icons.language),
                        onSelected: ref.read(settingsProvider.notifier).setLocale,
                        itemBuilder: (_) => const [
                          PopupMenuItem(value: Locale('en'), child: Text('English')),
                          PopupMenuItem(value: Locale('fa'), child: Text('دری')),
                          PopupMenuItem(value: Locale('ps'), child: Text('پښتو')),
                        ],
                      ),
                      TextButton(onPressed: () => context.go('/login'), child: Text(l10n.navLogin)),
                    ],
                  ),
                  homeAsync.when(
                    loading: () => SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(AppSpacing.page),
                        child: Column(
                          children: List.generate(
                            6,
                            (_) => const Padding(
                              padding: EdgeInsets.only(bottom: 12),
                              child: ShimmerBox(),
                            ),
                          ),
                        ),
                      ),
                    ),
                    error: (_, __) => SliverToBoxAdapter(
                      child: SizedBox(
                        height: MediaQuery.sizeOf(context).height * 0.55,
                        child: AppErrorView(type: AppErrorType.backend, onRetry: _loadData),
                      ),
                    ),
                    data: (data) => SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(AppSpacing.page),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (data.usingFallback) ...[
                              Material(
                                color: AppColors.warning.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(12),
                                child: Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.info_outline, color: AppColors.warning),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          l10n.publicDemoDataBanner,
                                          style: const TextStyle(fontSize: 15),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 16),
                            ],
                            Text(
                              l10n.publicHeroSubtitle,
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 22,
                                  ),
                            ),
                            const SizedBox(height: 16),
                            Wrap(
                              spacing: 12,
                              runSpacing: 12,
                              children: [
                                FilledButton.icon(
                                  onPressed: () => context.go('/login'),
                                  icon: const Icon(Icons.login),
                                  label: Text(l10n.navLogin),
                                ),
                                OutlinedButton.icon(
                                  onPressed: _scrollToClasses,
                                  icon: const Icon(Icons.class_outlined),
                                  label: Text(l10n.viewClasses),
                                ),
                              ],
                            ),
                            if (data.announcements.isNotEmpty) ...[
                              const SizedBox(height: 28),
                              _SectionTitle(l10n.commonAnnouncements),
                              const SizedBox(height: 12),
                              ...data.announcements.map(
                                (a) => Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: GlassCard(
                                    child: ListTile(
                                      leading: const Icon(Icons.campaign_outlined),
                                      title: Text(
                                        readLocalizedText(a['title']),
                                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                                      ),
                                      subtitle: Text(
                                        readLocalizedText(a['description'] ?? a['body']),
                                        maxLines: 3,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                            const SizedBox(height: 28),
                            KeyedSubtree(
                              key: _classesKey,
                              child: _SectionTitle(l10n.commonClasses),
                            ),
                            const SizedBox(height: 12),
                            if (data.classes.isEmpty)
                              AppErrorView(type: AppErrorType.empty, message: l10n.emptyState)
                            else
                              ...data.classes.take(12).map((item) => _OfferingCard(item: item)),
                            const SizedBox(height: 28),
                            _SectionTitle(l10n.commonCourses),
                            const SizedBox(height: 12),
                            if (data.courses.isEmpty)
                              AppErrorView(type: AppErrorType.empty, message: l10n.emptyState)
                            else
                              ...data.courses.take(12).map((item) => _OfferingCard(item: item)),
                            const SizedBox(height: 28),
                            _SectionTitle(l10n.academyServices),
                            const SizedBox(height: 12),
                            Text(
                              l10n.publicServicesBody,
                              style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontSize: 16, height: 1.5),
                            ),
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 10,
                              runSpacing: 10,
                              children: [
                                _ServiceChip(icon: Icons.class_, label: l10n.commonClasses),
                                _ServiceChip(icon: Icons.menu_book, label: l10n.commonCourses),
                                _ServiceChip(icon: Icons.fact_check, label: l10n.navAttendance),
                                _ServiceChip(icon: Icons.payments, label: l10n.navPayments),
                                _ServiceChip(icon: Icons.mail_outline, label: l10n.navMessages),
                              ],
                            ),
                            const SizedBox(height: 28),
                            _SectionTitle(l10n.navContact),
                            const SizedBox(height: 12),
                            GlassCard(
                              child: Column(
                                children: [
                                  TextField(
                                    controller: _contactName,
                                    decoration: InputDecoration(labelText: l10n.contactName),
                                  ),
                                  const SizedBox(height: 12),
                                  TextField(
                                    controller: _contactEmail,
                                    decoration: InputDecoration(labelText: l10n.contactEmail),
                                  ),
                                  const SizedBox(height: 12),
                                  TextField(
                                    controller: _contactMessage,
                                    maxLines: 4,
                                    decoration: InputDecoration(labelText: l10n.contactMessage),
                                  ),
                                  const SizedBox(height: 16),
                                  FilledButton(
                                    onPressed: _sendingContact ? null : _sendContact,
                                    child: Text(l10n.sendMessage),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 48),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800, fontSize: 22),
    );
  }
}

class _ServiceChip extends StatelessWidget {
  const _ServiceChip({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(avatar: Icon(icon, size: 18), label: Text(label, style: const TextStyle(fontSize: 15)));
  }
}

class _OfferingCard extends StatelessWidget {
  const _OfferingCard({required this.item});
  final Map<String, dynamic> item;

  @override
  Widget build(BuildContext context) {
    final fee = (item['feeAmount'] as num?) ?? 0;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${item['titleText'] ?? ''}',
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${item['descriptionText'] ?? ''}',
                        maxLines: 4,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 15, height: 1.4),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  formatCurrencyAfn(fee),
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                TextButton.icon(
                  onPressed: () => context.push('/catalog/detail', extra: item),
                  icon: const Icon(Icons.info_outline),
                  label: const Text('More info'),
                ),
                const Spacer(),
                FilledButton.tonalIcon(
                  onPressed: () {
                    final catalogType = '${item['catalogType'] ?? 'class'}';
                    context.push('/register', extra: {
                      'classId': item['classId'] ?? (catalogType == 'class' ? item['_id'] : ''),
                      'subjectId': item['subjectId'] ?? '',
                      'teacherId': item['teacherId'] ?? '',
                      'titleText': item['titleText'],
                      'catalogType': catalogType,
                    });
                  },
                  icon: const Icon(Icons.app_registration),
                  label: const Text('Register'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
