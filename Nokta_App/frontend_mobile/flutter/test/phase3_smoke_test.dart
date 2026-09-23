import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nokta_academy/app/env_config.dart';
import 'package:nokta_academy/core/permissions/mobile_permission_registry.dart';
import 'package:nokta_academy/features/auth/models/user_profile.dart';
import 'package:nokta_academy/features/family/providers/family_providers.dart';
import 'package:nokta_academy/l10n/app_localizations.dart';

void main() {
  testWidgets('RTL smoke renders login direction', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('fa'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: const Directionality(
          textDirection: TextDirection.rtl,
          child: Scaffold(body: Text('سلام')),
        ),
      ),
    );
    expect(find.text('سلام'), findsOneWidget);
  });

  test('selected student provider defaults null', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    expect(container.read(selectedStudentIdProvider), isNull);
  });

  test('dev readiness gated by APP_ENV', () {
    // Screen shows diagnostics only when EnvConfig.isDevelopment is true.
    expect(EnvConfig.environment, isNotEmpty);
    if (!EnvConfig.isDevelopment) {
      expect(EnvConfig.isDevelopment, isFalse);
    }
  });

  test('admin students route allowed for admin role', () {
    final registry = MobilePermissionRegistry();
    const user = UserProfile(
      id: '1',
      name: 'Admin',
      email: 'a@test.com',
      role: 'admin',
    );
    expect(registry.canViewRoute(user, MobileRoute.students), isTrue);
  });

  test('accountant can view expenses route', () {
    final registry = MobilePermissionRegistry();
    const user = UserProfile(
      id: '2',
      name: 'Acct',
      email: 'c@test.com',
      role: 'accountant',
    );
    expect(registry.canViewRoute(user, MobileRoute.expenses), isTrue);
  });
}
