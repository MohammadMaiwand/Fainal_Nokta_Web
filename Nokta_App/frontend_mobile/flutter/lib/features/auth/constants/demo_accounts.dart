/// Local QA demo accounts (development only).
abstract final class DemoAccounts {
  static const roles = [
    DemoRole.superAdmin,
    DemoRole.admin,
    DemoRole.teacher,
    DemoRole.student,
    DemoRole.parent,
  ];

  static DemoRole? roleFromKey(String? key) {
    if (key == null || key.isEmpty) return null;
    for (final role in roles) {
      if (role.key == key) return role;
    }
    return null;
  }
}

enum DemoRole {
  superAdmin('super_admin', 'superadmin.qa@nokta.local', 'SuperAdmin@123'),
  admin('admin', 'admin.qa@nokta.local', 'Admin@12345'),
  teacher('teacher', 'teacher.qa@nokta.local', 'Teacher@12345'),
  student('student', 'student.qa@nokta.local', 'Student@12345'),
  parent('parent', 'parent.qa@nokta.local', 'Parent@12345');

  const DemoRole(this.key, this.email, this.password);

  final String key;
  final String email;
  final String password;

  String labelEn() => switch (this) {
        DemoRole.superAdmin => 'Super Admin',
        DemoRole.admin => 'Admin',
        DemoRole.teacher => 'Teacher',
        DemoRole.student => 'Student',
        DemoRole.parent => 'Parent',
      };
}
