import 'package:flutter_test/flutter_test.dart';
import 'package:nokta_academy/core/permissions/mobile_permission_registry.dart';
import 'package:nokta_academy/features/auth/models/user_profile.dart';

void main() {
  group('MobilePermissionRegistry dashboard actions', () {
    final registry = MobilePermissionRegistry();

    test('student quick actions exclude finance and students admin', () {
      const user = UserProfile(
        id: '1',
        name: 'Student',
        email: 's@test.com',
        role: 'student',
      );
      final actions = registry.dashboardQuickActions(user);
      expect(actions, contains('timetable'));
      expect(actions, contains('payments'));
      expect(actions, isNot(contains('finance')));
      expect(actions, isNot(contains('students')));
    });

    test('accountant dashboard shows finance/payments', () {
      const user = UserProfile(
        id: '2',
        name: 'Accountant',
        email: 'a@test.com',
        role: 'accountant',
      );
      final actions = registry.dashboardQuickActions(user);
      expect(actions, contains('finance'));
      expect(actions, contains('payments'));
      expect(actions, contains('expenses'));
    });

    test('parent can view family route', () {
      const user = UserProfile(
        id: '3',
        name: 'Parent',
        email: 'p@test.com',
        role: 'parent',
      );
      expect(registry.canViewRoute(user, MobileRoute.family), isTrue);
      expect(registry.studentsListPath(user), '/students/family');
    });

    test('owner can view audit when module allows', () {
      const user = UserProfile(
        id: '4',
        name: 'Owner',
        email: 'o@test.com',
        role: 'owner',
      );
      expect(registry.canViewRoute(user, MobileRoute.audit), isTrue);
    });
  });
}
