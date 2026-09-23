import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/constants.dart';
import '../../../core/api/api_client.dart';
import '../../../core/widgets/logout_action.dart';
import '../../../core/providers/resource_repository_provider.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../features/settings/providers/settings_provider.dart';
import '../../../l10n/app_localizations.dart';

class StudentEnrollmentScreen extends ConsumerStatefulWidget {
  const StudentEnrollmentScreen({super.key});

  @override
  ConsumerState<StudentEnrollmentScreen> createState() => _StudentEnrollmentScreenState();
}

class _StudentEnrollmentScreenState extends ConsumerState<StudentEnrollmentScreen> {
  late Future<_EnrollmentData> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    final repo = ref.read(resourceRepositoryProvider);
    final api = ref.read(apiClientProvider);
    _future = Future.wait([
      api.get(ApiPaths.studentsMeProfile).then((response) {
        final data = ApiClient.unwrapData(response.data);
        return data is Map<String, dynamic> ? data : {};
      }),
      repo.list(ApiPaths.studentsMeClasses),
      repo.list(ApiPaths.studentsMeSubjects),
      repo.list(ApiPaths.studentsMeTeachers),
      repo.list(ApiPaths.studentsMePayments),
    ]).then((results) {
      return _EnrollmentData(
        profile: results[0] as Map<String, dynamic>,
        classes: results[1] as List<Map<String, dynamic>>,
        subjects: results[2] as List<Map<String, dynamic>>,
        teachers: results[3] as List<Map<String, dynamic>>,
        payments: results[4] as List<Map<String, dynamic>>,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = ref.watch(settingsProvider).locale.languageCode;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My enrollment'),
        actions: const [AppBarLogoutAction()],
      ),
      body: FutureBuilder<_EnrollmentData>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('${snapshot.error}'));
          }
          final data = snapshot.data!;
          final student = data.profile['student'] is Map
              ? data.profile['student'] as Map<String, dynamic>
              : data.profile;
          final enrolledAt = student['enrolledAt'] ?? student['createdAt'];
          final paidTotal = data.payments.fold<double>(
            0,
            (sum, p) => sum + ((p['amount'] as num?)?.toDouble() ?? 0),
          );

          return RefreshIndicator(
            onRefresh: () async {
              setState(_reload);
              await _future;
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                GlassCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Registration', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      Text(
                        'Date: ${formatDisplayDate(DateTime.tryParse('$enrolledAt'), useJalali: locale.startsWith('fa') || locale.startsWith('ps'))}',
                      ),
                      Text('Total paid: ${formatCurrencyAfn(paidTotal, locale: locale)}'),
                      Text('Status: ${student['enrollmentStatus'] ?? student['status'] ?? '-'}'),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text(l10n.navClasses, style: Theme.of(context).textTheme.titleMedium),
                ...data.classes.map((c) => _InfoTile(
                      title: '${c['className'] ?? c['name'] ?? c['title']}',
                      subtitle: '${c['description'] ?? ''}',
                    )),
                const SizedBox(height: 12),
                Text(l10n.navSubjects, style: Theme.of(context).textTheme.titleMedium),
                ...data.subjects.map((s) => _InfoTile(
                      title: '${s['title'] ?? s['name']}',
                      subtitle: '${s['code'] ?? ''}',
                    )),
                const SizedBox(height: 12),
                Text(l10n.navTeachers, style: Theme.of(context).textTheme.titleMedium),
                ...data.teachers.map((t) => _InfoTile(
                      title: '${t['name']}',
                      subtitle: '${t['email'] ?? ''} • ${t['phone'] ?? ''}',
                    )),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _EnrollmentData {
  _EnrollmentData({
    required this.profile,
    required this.classes,
    required this.subjects,
    required this.teachers,
    required this.payments,
  });

  final Map<String, dynamic> profile;
  final List<Map<String, dynamic>> classes;
  final List<Map<String, dynamic>> subjects;
  final List<Map<String, dynamic>> teachers;
  final List<Map<String, dynamic>> payments;
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: GlassCard(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
            if (subtitle.trim().isNotEmpty) Text(subtitle),
          ],
        ),
      ),
    );
  }
}
