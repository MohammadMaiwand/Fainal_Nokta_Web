import 'package:flutter_test/flutter_test.dart';
import 'package:nokta_academy/core/permissions/mobile_permission_registry.dart';
import 'package:nokta_academy/features/auth/models/user_profile.dart';

void main() {
  test('role-based dashboard quick actions differ by role', () {
    final registry = MobilePermissionRegistry();

    final studentActions = registry.dashboardQuickActions(
      const UserProfile(id: '1', name: 'S', email: 's@t.com', role: 'student'),
    );
    final teacherActions = registry.dashboardQuickActions(
      const UserProfile(id: '2', name: 'T', email: 't@t.com', role: 'teacher'),
    );
    final adminActions = registry.dashboardQuickActions(
      const UserProfile(id: '3', name: 'A', email: 'a@t.com', role: 'admin'),
    );

    expect(studentActions, contains('results'));
    expect(studentActions, isNot(contains('finance')));
    expect(teacherActions, contains('attendance'));
    expect(adminActions, contains('students'));
    expect(studentActions, isNot(contains('students')));
  });
}
