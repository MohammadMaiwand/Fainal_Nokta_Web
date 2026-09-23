import 'package:flutter_test/flutter_test.dart';
import 'package:nokta_academy/core/permissions/mobile_permission_registry.dart';
import 'package:nokta_academy/features/auth/models/user_profile.dart';

void main() {
  final registry = MobilePermissionRegistry();

  test('student cannot view finance or reports', () {
    const student = UserProfile(
      id: '1',
      name: 'S',
      email: 's@t.com',
      role: 'student',
    );
    expect(registry.canViewRoute(student, MobileRoute.finance), isFalse);
    expect(registry.canViewRoute(student, MobileRoute.reports), isFalse);
    expect(registry.canViewRoute(student, MobileRoute.students), isFalse);
  });

  test('teacher cannot view finance ledger', () {
    const teacher = UserProfile(
      id: '2',
      name: 'T',
      email: 't@t.com',
      role: 'teacher',
    );
    expect(registry.financePath(teacher), '/finance/me/earnings');
    expect(registry.canViewRoute(teacher, MobileRoute.payments), isFalse);
    expect(registry.canViewRoute(teacher, MobileRoute.students), isTrue);
  });

  test('accountant can view finance and payments', () {
    const accountant = UserProfile(
      id: '3',
      name: 'A',
      email: 'a@t.com',
      role: 'accountant',
    );
    expect(registry.canViewRoute(accountant, MobileRoute.finance), isTrue);
    expect(registry.canViewRoute(accountant, MobileRoute.payments), isTrue);
    expect(registry.canViewRoute(accountant, MobileRoute.students), isFalse);
    expect(registry.canViewRoute(accountant, MobileRoute.expenses), isTrue);
  });

  test('parent uses family students path', () {
    const parent = UserProfile(
      id: '4',
      name: 'P',
      email: 'p@t.com',
      role: 'parent',
    );
    expect(registry.studentsListPath(parent), '/students/family');
    expect(registry.canViewRoute(parent, MobileRoute.students), isTrue);
    expect(registry.canViewRoute(parent, MobileRoute.family), isTrue);
  });

  test('librarian sees library', () {
    const lib = UserProfile(
      id: '5',
      name: 'L',
      email: 'l@t.com',
      role: 'librarian',
    );
    expect(registry.canViewRoute(lib, MobileRoute.library), isTrue);
    expect(registry.canViewRoute(lib, MobileRoute.finance), isFalse);
  });
}
