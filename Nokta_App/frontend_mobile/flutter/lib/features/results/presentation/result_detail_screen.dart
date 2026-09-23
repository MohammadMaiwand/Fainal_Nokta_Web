import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme.dart';
import '../../../core/api/api_client.dart';
import '../../../core/auth/permission_service.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../features/settings/providers/settings_provider.dart';

class ResultDetailScreen extends ConsumerStatefulWidget {
  const ResultDetailScreen({super.key, required this.resultId});

  final String resultId;

  @override
  ConsumerState<ResultDetailScreen> createState() => _ResultDetailScreenState();
}

class _ResultDetailScreenState extends ConsumerState<ResultDetailScreen> {
  final _scoreController = TextEditingController();
  final _remarksController = TextEditingController();
  bool _loading = true;
  bool _saving = false;
  Map<String, dynamic>? _result;

  @override
  void dispose() {
    _scoreController.dispose();
    _remarksController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final lang = ref.read(settingsProvider).locale.languageCode;
      final response = await ref.read(apiClientProvider).get(
            '/results/${widget.resultId}',
            queryParameters: {'lang': lang},
          );
      final data = ApiClient.unwrapData(response.data) as Map<String, dynamic>? ?? {};
      _scoreController.text = '${data['score'] ?? ''}';
      _remarksController.text = '${data['remarks'] ?? ''}';
      setState(() => _result = data);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final lang = ref.read(settingsProvider).locale.languageCode;
      await ref.read(apiClientProvider).patch(
            '/results/${widget.resultId}',
            data: {
              'score': num.tryParse(_scoreController.text.trim()),
              'remarks': _remarksController.text.trim(),
              'lang': lang,
            },
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Result updated')),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final canEdit = ref.watch(permissionServiceProvider).registry.canEditResults(user);

    return Scaffold(
      appBar: AppBar(title: const Text('Exam result')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                GlassCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${_result?['exam'] is Map ? (_result!['exam'] as Map)['title'] : 'Exam'}',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 8),
                      Text('Grade: ${_result?['grade'] ?? '-'}'),
                      if (_result?['student'] is Map)
                        Text(
                          'Student: ${(_result!['student'] as Map)['firstName'] ?? ''} ${(_result!['student'] as Map)['lastName'] ?? ''}',
                        ),
                    ],
                  ),
                ),
                if (canEdit) ...[
                  const SizedBox(height: 16),
                  GlassCard(
                    child: Column(
                      children: [
                        TextFormField(
                          controller: _scoreController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(
                            labelText: 'Score',
                            prefixIcon: Icon(Icons.score_outlined),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _remarksController,
                          maxLines: 3,
                          decoration: const InputDecoration(
                            labelText: 'Remarks',
                            prefixIcon: Icon(Icons.notes_outlined),
                          ),
                        ),
                        const SizedBox(height: 16),
                        FilledButton.icon(
                          onPressed: _saving ? null : _save,
                          icon: const Icon(Icons.save),
                          label: const Text('Save changes'),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            minimumSize: const Size.fromHeight(48),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
    );
  }
}
