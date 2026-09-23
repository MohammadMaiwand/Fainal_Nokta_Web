import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/providers/repositories_provider.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/glass_card.dart';
import '../../../core/widgets/nokta_logo.dart';
import '../../../core/widgets/offline_banner.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../features/settings/providers/settings_provider.dart';
import '../../../l10n/app_localizations.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key, this.initialSelection});

  final Map<String, dynamic>? initialSelection;

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _whatsapp = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  final _paymentReference = TextEditingController();

  String _gender = '';
  String _classId = '';
  String _subjectId = '';
  String _teacherId = '';
  String _checkoutToken = '';

  Map<String, dynamic>? _options;
  Map<String, dynamic>? _quote;
  bool _loadingOptions = true;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final sel = widget.initialSelection ?? {};
    _classId = '${sel['classId'] ?? ''}';
    _subjectId = '${sel['subjectId'] ?? ''}';
    _teacherId = '${sel['teacherId'] ?? ''}';
    _loadOptions();
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _email.dispose();
    _phone.dispose();
    _whatsapp.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    _paymentReference.dispose();
    super.dispose();
  }

  Future<void> _loadOptions() async {
    setState(() {
      _loadingOptions = true;
      _error = null;
    });
    try {
      final data = await ref.read(registrationRepositoryProvider).fetchOptions(
            classId: _classId.isEmpty ? null : _classId,
            subjectId: _subjectId.isEmpty ? null : _subjectId,
          );
      if (!mounted) return;
      setState(() {
        _options = data;
        _loadingOptions = false;
      });
      await _refreshQuote();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingOptions = false;
        _error = '$e';
      });
    }
  }

  Future<void> _refreshQuote() async {
    if (_classId.isEmpty || _subjectId.isEmpty || _teacherId.isEmpty) {
      setState(() => _quote = null);
      return;
    }
    try {
      final quote = await ref.read(registrationRepositoryProvider).quote(
            classId: _classId,
            subjectId: _subjectId,
            teacherId: _teacherId,
          );
      if (!mounted) return;
      setState(() => _quote = quote);
    } catch (_) {
      if (!mounted) return;
      setState(() => _quote = null);
    }
  }

  double get _totalFee {
    final pricing = _quote?['pricing'];
    if (pricing is Map) return (pricing['totalFee'] as num?)?.toDouble() ?? 0;
    return 0;
  }

  List<Map<String, dynamic>> get _classes =>
      (_options?['classes'] as List?)?.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList() ?? [];

  List<Map<String, dynamic>> get _subjects {
    final all = (_options?['subjects'] as List?)?.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList() ?? [];
    if (_classId.isEmpty) return all;
    return all.where((s) => '${s['classId']}' == _classId).toList();
  }

  List<Map<String, dynamic>> get _teachers =>
      (_options?['teachers'] as List?)?.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList() ?? [];

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_gender.isEmpty || _classId.isEmpty || _subjectId.isEmpty || _teacherId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select class, subject, teacher and gender.')),
      );
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    final repo = ref.read(registrationRepositoryProvider);
    try {
      var checkoutToken = _checkoutToken;
      final paymentRef = _paymentReference.text.trim();

      if (_totalFee > 0) {
        final checkout = await repo.createCheckout(
          email: _email.text.trim(),
          classId: _classId,
          subjectId: _subjectId,
          teacherId: _teacherId,
        );
        checkoutToken = '${checkout['checkoutToken'] ?? ''}';
        if (checkoutToken.isEmpty) {
          throw ApiException(message: 'Unable to prepare payment checkout.');
        }
        if (paymentRef.length < 6) {
          throw ApiException(message: 'Enter your payment reference (min 6 characters).');
        }
        final confirmed = await repo.confirmPayment(
          email: _email.text.trim(),
          classId: _classId,
          subjectId: _subjectId,
          teacherId: _teacherId,
          checkoutToken: checkoutToken,
          paymentReference: paymentRef,
        );
        checkoutToken = '${confirmed['checkoutToken'] ?? checkoutToken}';
      }

      await repo.registerStudent({
        'firstName': _firstName.text.trim(),
        'lastName': _lastName.text.trim(),
        'email': _email.text.trim(),
        'phone': _phone.text.trim(),
        'whatsapp': _whatsapp.text.trim().isEmpty ? _phone.text.trim() : _whatsapp.text.trim(),
        'password': _password.text,
        'confirmPassword': _confirmPassword.text,
        'gender': _gender,
        'classId': _classId,
        'subjectId': _subjectId,
        'teacherId': _teacherId,
        if (checkoutToken.isNotEmpty) 'checkoutToken': checkoutToken,
        if (_totalFee > 0) 'paymentReference': paymentRef,
        if (_totalFee > 0) 'paymentMethod': 'mobile_money',
      });

      await ref.read(authProvider.notifier).login(
            email: _email.text.trim(),
            password: _password.text,
            rememberMe: true,
            expectedRole: 'student',
          );

      if (!mounted) return;
      context.go('/app/dashboard');
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = ref.watch(settingsProvider).locale.languageCode;
    final selectionTitle = widget.initialSelection?['titleText'] ?? widget.initialSelection?['title'];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Student registration'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/'),
        ),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Center(child: NoktaLogo(size: 72)),
                const SizedBox(height: 12),
                if (selectionTitle != null)
                  Text(
                    'Register for: $selectionTitle',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                const SizedBox(height: 16),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(_error!, style: const TextStyle(color: AppColors.danger)),
                  ),
                if (_loadingOptions)
                  const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
                else
                  Form(
                    key: _formKey,
                    child: Column(
                      children: [
                        GlassCard(
                          child: Column(
                            children: [
                              _dropdown(
                                label: 'Class',
                                value: _classId.isEmpty ? null : _classId,
                                items: _classes
                                    .map((c) => DropdownMenuItem(
                                          value: '${c['_id']}',
                                          child: Text('${c['className'] ?? c['name']}'),
                                        ))
                                    .toList(),
                                onChanged: (v) async {
                                  setState(() {
                                    _classId = v ?? '';
                                    _subjectId = '';
                                    _teacherId = '';
                                  });
                                  await _loadOptions();
                                },
                              ),
                              _dropdown(
                                label: 'Subject',
                                value: _subjectId.isEmpty ? null : _subjectId,
                                items: _subjects
                                    .map((s) => DropdownMenuItem(
                                          value: '${s['_id']}',
                                          child: Text('${s['title']}'),
                                        ))
                                    .toList(),
                                onChanged: (v) async {
                                  setState(() {
                                    _subjectId = v ?? '';
                                    _teacherId = '';
                                  });
                                  await _loadOptions();
                                  await _refreshQuote();
                                },
                              ),
                              _dropdown(
                                label: 'Teacher',
                                value: _teacherId.isEmpty ? null : _teacherId,
                                items: _teachers
                                    .map((t) => DropdownMenuItem(
                                          value: '${t['_id']}',
                                          child: Text('${t['name']}'),
                                        ))
                                    .toList(),
                                onChanged: (v) async {
                                  setState(() => _teacherId = v ?? '');
                                  await _refreshQuote();
                                },
                              ),
                              if (_totalFee > 0)
                                Padding(
                                  padding: const EdgeInsets.only(top: 8),
                                  child: Text(
                                    'Total fee: ${formatCurrencyAfn(_totalFee, locale: locale)}',
                                    style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        GlassCard(
                          child: Column(
                            children: [
                              TextFormField(
                                controller: _firstName,
                                decoration: const InputDecoration(labelText: 'First name'),
                                validator: (v) => (v == null || v.trim().length < 2) ? l10n.errorGeneric : null,
                              ),
                              TextFormField(
                                controller: _lastName,
                                decoration: const InputDecoration(labelText: 'Last name'),
                                validator: (v) => (v == null || v.trim().length < 2) ? l10n.errorGeneric : null,
                              ),
                              _dropdown(
                                label: 'Gender',
                                value: _gender.isEmpty ? null : _gender,
                                items: const [
                                  DropdownMenuItem(value: 'male', child: Text('Male')),
                                  DropdownMenuItem(value: 'female', child: Text('Female')),
                                  DropdownMenuItem(value: 'other', child: Text('Other')),
                                ],
                                onChanged: (v) => setState(() => _gender = v ?? ''),
                              ),
                              TextFormField(
                                controller: _email,
                                keyboardType: TextInputType.emailAddress,
                                decoration: InputDecoration(labelText: l10n.email),
                                validator: (v) => (v == null || !v.contains('@')) ? l10n.errorGeneric : null,
                              ),
                              TextFormField(
                                controller: _phone,
                                keyboardType: TextInputType.phone,
                                decoration: const InputDecoration(labelText: 'Phone'),
                                validator: (v) => (v == null || v.trim().length < 10) ? l10n.errorGeneric : null,
                              ),
                              TextFormField(
                                controller: _whatsapp,
                                keyboardType: TextInputType.phone,
                                decoration: const InputDecoration(labelText: 'WhatsApp (optional)'),
                              ),
                              TextFormField(
                                controller: _password,
                                obscureText: true,
                                decoration: InputDecoration(labelText: l10n.password),
                                validator: (v) => (v == null || v.length < 8) ? l10n.errorGeneric : null,
                              ),
                              TextFormField(
                                controller: _confirmPassword,
                                obscureText: true,
                                decoration: const InputDecoration(labelText: 'Confirm password'),
                                validator: (v) => v != _password.text ? l10n.errorGeneric : null,
                              ),
                              if (_totalFee > 0) ...[
                                const SizedBox(height: 8),
                                TextFormField(
                                  controller: _paymentReference,
                                  decoration: const InputDecoration(
                                    labelText: 'Payment reference',
                                    helperText: 'Enter the reference from your mobile payment',
                                  ),
                                  validator: (v) =>
                                      (v == null || v.trim().length < 6) ? 'Payment reference required' : null,
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                        FilledButton.icon(
                          onPressed: _submitting ? null : _submit,
                          icon: _submitting
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Icon(Icons.payment_rounded),
                          label: Text(_totalFee > 0 ? 'Pay & create account' : 'Create account'),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            minimumSize: const Size.fromHeight(52),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                        ),
                        TextButton(
                          onPressed: () => context.go('/login'),
                          child: Text(l10n.loginButton),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _dropdown({
    required String label,
    required String? value,
    required List<DropdownMenuItem<String>> items,
    required ValueChanged<String?> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: DropdownButtonFormField<String>(
        value: items.any((i) => i.value == value) ? value : null,
        decoration: InputDecoration(labelText: label),
        items: items,
        onChanged: onChanged,
        validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
      ),
    );
  }
}
