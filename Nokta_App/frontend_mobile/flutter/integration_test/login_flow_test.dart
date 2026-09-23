import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:nokta_academy/features/auth/constants/demo_accounts.dart';
import 'package:nokta_academy/main.dart' as app;

/// End-to-end login on Chrome/device against a running backend (port 4000).
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('student QA can sign in and reach dashboard', (tester) async {
    app.main();
    await tester.pumpAndSettle(const Duration(seconds: 5));

    await tester.tap(find.textContaining('Login').first);
    await tester.pumpAndSettle(const Duration(seconds: 3));

    final student = DemoRole.student;
    await tester.enterText(find.byType(TextFormField).at(1), student.email);
    await tester.enterText(find.byType(TextFormField).at(2), student.password);
    await tester.pump();

    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle(const Duration(seconds: 8));

    expect(find.textContaining('Dashboard'), findsWidgets);
  });
}
