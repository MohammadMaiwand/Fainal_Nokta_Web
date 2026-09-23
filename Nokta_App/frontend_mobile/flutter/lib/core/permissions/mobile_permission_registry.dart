import '../../app/constants.dart';
import '../../features/auth/models/user_profile.dart';

/// Mobile route identifiers aligned with GoRouter paths.
enum MobileRoute {
  dashboard,
  profile,
  settings,
  messages,
  notifications,
  timetable,
  attendance,
  payments,
  results,
  classes,
  subjects,
  students,
  teachers,
  finance,
  reports,
  library,
  audit,
  family,
  expenses,
  salaries,
}

/// Maps Flutter screens to web `modules.ts` view roles and enterprise permission keys.
class MobilePermissionRegistry {
  static const _coreViewRoles = [
    AppRoles.superAdmin,
    AppRoles.admin,
    AppRoles.branchManager,
    AppRoles.teacher,
    AppRoles.student,
    AppRoles.parent,
    AppRoles.owner,
  ];

  static const _moduleViewRoles = <String, List<String>>{
    'timetable': [
      AppRoles.superAdmin,
      AppRoles.admin,
      AppRoles.branchManager,
      AppRoles.teacher,
      AppRoles.student,
      AppRoles.parent,
      AppRoles.owner,
    ],
    'attendance': [
      AppRoles.superAdmin,
      AppRoles.admin,
      AppRoles.branchManager,
      AppRoles.teacher,
      AppRoles.student,
      AppRoles.parent,
      AppRoles.owner,
    ],
    'payments': [
      AppRoles.superAdmin,
      AppRoles.admin,
      AppRoles.branchManager,
      AppRoles.owner,
      AppRoles.student,
      AppRoles.parent,
      AppRoles.accountant,
    ],
    'messages': [
      AppRoles.superAdmin,
      AppRoles.admin,
      AppRoles.branchManager,
      AppRoles.teacher,
      AppRoles.student,
      AppRoles.parent,
      AppRoles.owner,
    ],
    'results': [
      AppRoles.superAdmin,
      AppRoles.admin,
      AppRoles.branchManager,
      AppRoles.teacher,
      AppRoles.student,
      AppRoles.parent,
      AppRoles.owner,
    ],
    'classes': [
      AppRoles.superAdmin,
      AppRoles.admin,
      AppRoles.branchManager,
      AppRoles.teacher,
      AppRoles.student,
      AppRoles.parent,
      AppRoles.owner,
    ],
    'subjects': [
      AppRoles.superAdmin,
      AppRoles.admin,
      AppRoles.branchManager,
      AppRoles.teacher,
      AppRoles.student,
      AppRoles.parent,
      AppRoles.owner,
    ],
    'students': [
      AppRoles.superAdmin,
      AppRoles.admin,
      AppRoles.branchManager,
      AppRoles.teacher,
    ],
    'teachers': [
      AppRoles.superAdmin,
      AppRoles.admin,
      AppRoles.branchManager,
      AppRoles.teacher,
      AppRoles.student,
      AppRoles.parent,
      AppRoles.owner,
    ],
    'finance': [
      AppRoles.superAdmin,
      AppRoles.admin,
      AppRoles.branchManager,
      AppRoles.owner,
      AppRoles.accountant,
    ],
    'reports': [
      AppRoles.superAdmin,
      AppRoles.admin,
      AppRoles.branchManager,
      AppRoles.owner,
    ],
    'books': [
      ..._coreViewRoles,
      AppRoles.accountant,
      AppRoles.librarian,
    ],
    'audit': [
      AppRoles.superAdmin,
      AppRoles.admin,
      AppRoles.owner,
      AppRoles.branchManager,
    ],
    'expenses': [
      AppRoles.superAdmin,
      AppRoles.admin,
      AppRoles.branchManager,
      AppRoles.owner,
      AppRoles.accountant,
    ],
    'salaries': [
      AppRoles.superAdmin,
      AppRoles.admin,
      AppRoles.branchManager,
      AppRoles.owner,
    ],
    'notifications': [
      AppRoles.superAdmin,
      AppRoles.admin,
      AppRoles.branchManager,
      AppRoles.teacher,
      AppRoles.student,
      AppRoles.parent,
      AppRoles.owner,
    ],
  };

  static const _permissionKeyByModule = <String, String>{
    'timetable': 'CLASS_VIEW',
    'attendance': 'ATTENDANCE_VIEW',
    'payments': 'PAYMENT_VIEW',
    'messages': 'MESSAGE_VIEW',
    'results': 'RESULT_VIEW',
    'classes': 'CLASS_VIEW',
    'subjects': 'SUBJECT_VIEW',
    'students': 'STUDENT_VIEW',
    'teachers': 'TEACHER_VIEW',
    'finance': 'FINANCE_VIEW',
    'reports': 'REPORT_VIEW',
    'books': 'RESOURCE_VIEW',
    'audit': 'AUDIT_VIEW',
    'notifications': 'MESSAGE_VIEW',
  };

  String? moduleForRoute(MobileRoute route) {
    return switch (route) {
      MobileRoute.timetable => 'timetable',
      MobileRoute.attendance => 'attendance',
      MobileRoute.payments => 'payments',
      MobileRoute.messages => 'messages',
      MobileRoute.results => 'results',
      MobileRoute.classes => 'classes',
      MobileRoute.subjects => 'subjects',
      MobileRoute.students => 'students',
      MobileRoute.teachers => 'teachers',
      MobileRoute.finance => 'finance',
      MobileRoute.reports => 'reports',
      MobileRoute.library => 'books',
      MobileRoute.audit => 'audit',
      MobileRoute.expenses => 'expenses',
      MobileRoute.salaries => 'salaries',
      MobileRoute.notifications => 'notifications',
      MobileRoute.family => 'students',
      _ => null,
    };
  }

  bool canViewRoute(UserProfile? user, MobileRoute route) {
    if (user == null) return false;
    if (_isSuperAdmin(user)) return true;

    final module = moduleForRoute(route);
    if (module == null) {
      return switch (route) {
        MobileRoute.dashboard || MobileRoute.profile || MobileRoute.settings => true,
        _ => false,
      };
    }

    if (route == MobileRoute.family && _isParentLike(user)) return true;
    if (module == 'students' && _isParentLike(user)) return true;
    if (module == 'students' && user.isRole(AppRoles.student)) return false;
    if (module == 'finance') {
      if (user.isRole(AppRoles.teacher)) {
        return canViewTeacherEarnings(user);
      }
      if (user.isRole(AppRoles.accountant) || _isAdminLike(user) || user.isRole(AppRoles.owner)) {
        return _hasModuleAccess(user, module);
      }
      return false;
    }
    if (module == 'books' && user.isRole(AppRoles.librarian)) return true;

    return _hasModuleAccess(user, module);
  }

  bool canMarkAttendance(UserProfile? user) {
    if (user == null) return false;
    if (_isSuperAdmin(user)) return true;
    if (hasPermissionKey(user, 'ATTENDANCE_MARK')) return true;
    return user.isRole(AppRoles.teacher) ||
        user.isRole(AppRoles.student) ||
        _isAdminLike(user);
  }

  bool canReplyMessages(UserProfile? user) {
    if (user == null) return false;
    if (hasPermissionKey(user, 'MESSAGE_CREATE')) return true;
    return user.isRole(AppRoles.teacher) ||
        user.isRole(AppRoles.admin) ||
        user.isRole(AppRoles.branchManager) ||
        user.isRole(AppRoles.superAdmin) ||
        user.isRole(AppRoles.owner);
  }

  bool canComposeMessages(UserProfile? user) {
    if (user == null) return false;
    if (_isSuperAdmin(user)) return true;
    if (hasPermissionKey(user, 'MESSAGE_CREATE')) return true;
    return user.isRole(AppRoles.teacher) ||
        user.isRole(AppRoles.student) ||
        user.isRole(AppRoles.parent) ||
        user.isRole(AppRoles.familyStudent) ||
        _isAdminLike(user);
  }

  bool canEditResults(UserProfile? user) {
    if (user == null) return false;
    if (_isSuperAdmin(user)) return true;
    return user.isRole(AppRoles.teacher) || _isAdminLike(user);
  }

  bool canEditProfilePhoto(UserProfile? user) =>
      user != null && (user.isRole(AppRoles.teacher) || user.isRole(AppRoles.student) || _isAdminLike(user));

  bool canEditProfilePhone(UserProfile? user) =>
      user != null && (user.isRole(AppRoles.teacher) || _isAdminLike(user));

  bool canChangePassword(UserProfile? user) => user != null;

  bool canViewTeacherEarnings(UserProfile user) => user.isRole(AppRoles.teacher);

  bool hasPermissionKey(UserProfile user, String key) {
    if (user.revokedPermissionKeys.contains(key)) return false;
    if (user.permissionKeys.contains(key)) return true;
    return user.permissions.entries.any((entry) {
      final moduleKey = _permissionKeyByModule[entry.key];
      if (moduleKey == key) return entry.value.contains('view');
      return false;
    });
  }

  bool _hasModuleAccess(UserProfile user, String module) {
    final key = _permissionKeyByModule[module];
    if (key != null && hasPermissionKey(user, key)) return true;

    final roles = _moduleViewRoles[module];
    if (roles == null) return false;
    return roles.any((r) => user.isRole(r));
  }

  String studentsListPath(UserProfile user) {
    if (_isParentLike(user)) return ApiPaths.studentsFamily;
    if (user.isRole(AppRoles.teacher)) return ApiPaths.studentsTeacher;
    return ApiPaths.students;
  }

  String teachersListPath(UserProfile user) {
    if (user.isRole(AppRoles.student) || user.isRole(AppRoles.familyStudent)) {
      return ApiPaths.studentsMeTeachers;
    }
    return ApiPaths.teachers;
  }

  String financePath(UserProfile user) {
    if (user.isRole(AppRoles.teacher) && !_isFinanceStaff(user)) {
      return ApiPaths.financeMeEarnings;
    }
    return ApiPaths.finance;
  }

  List<MobileRoute> drawerRoutesFor(UserProfile user) {
    final role = user.effectiveRole;

    if (role == AppRoles.teacher) {
      const order = [
        MobileRoute.timetable,
        MobileRoute.attendance,
        MobileRoute.students,
        MobileRoute.classes,
        MobileRoute.subjects,
        MobileRoute.results,
        MobileRoute.finance,
        MobileRoute.messages,
        MobileRoute.notifications,
      ];
      return order.where((r) => canViewRoute(user, r)).toList();
    }

    if (user.isRole(AppRoles.student)) {
      const order = [
        MobileRoute.classes,
        MobileRoute.subjects,
        MobileRoute.teachers,
        MobileRoute.timetable,
        MobileRoute.payments,
        MobileRoute.results,
        MobileRoute.messages,
        MobileRoute.notifications,
      ];
      return order.where((r) => canViewRoute(user, r)).toList();
    }

    const order = [
      MobileRoute.timetable,
      MobileRoute.attendance,
      MobileRoute.payments,
      MobileRoute.results,
      MobileRoute.classes,
      MobileRoute.subjects,
      MobileRoute.notifications,
      MobileRoute.messages,
      MobileRoute.students,
      MobileRoute.teachers,
      MobileRoute.finance,
      MobileRoute.reports,
      MobileRoute.library,
      MobileRoute.expenses,
      MobileRoute.salaries,
      MobileRoute.audit,
    ];
    return order.where((r) => canViewRoute(user, r)).toList();
  }

  List<String> dashboardQuickActions(UserProfile user) {
    final actions = <String>[];
    if (canViewRoute(user, MobileRoute.profile)) actions.add('profile');
    if (canViewRoute(user, MobileRoute.messages)) actions.add('messages');
    if (canViewRoute(user, MobileRoute.notifications)) actions.add('notifications');

    final role = user.effectiveRole;
    if (user.isRole(AppRoles.student)) {
      actions.addAll(['timetable', 'payments', 'results', 'messages', 'notifications']);
    } else if (_isParentLike(user)) {
      actions.addAll(['family', 'timetable', 'attendance', 'payments', 'results', 'messages']);
    } else if (role == AppRoles.teacher) {
      actions.addAll(['timetable', 'attendance', 'classes', 'results', 'messages']);
    } else if (_isAdminLike(user)) {
      actions.addAll([
        'students',
        'teachers',
        'classes',
        'timetable',
        'attendance',
        'payments',
        'reports',
      ]);
    } else if (role == AppRoles.accountant) {
      actions.addAll(['payments', 'expenses', 'finance', 'reports']);
    } else if (role == AppRoles.librarian) {
      actions.add('library');
    } else if (role == AppRoles.owner) {
      actions.addAll(['finance', 'reports']);
      if (canViewRoute(user, MobileRoute.audit)) actions.add('audit');
    }
    return actions.toSet().toList();
  }

  MobileRoute? routeFromQuickAction(String action) {
    return switch (action) {
      'profile' => MobileRoute.profile,
      'messages' => MobileRoute.messages,
      'notifications' => MobileRoute.notifications,
      'timetable' => MobileRoute.timetable,
      'attendance' => MobileRoute.attendance,
      'payments' => MobileRoute.payments,
      'results' => MobileRoute.results,
      'classes' => MobileRoute.classes,
      'students' => MobileRoute.students,
      'teachers' => MobileRoute.teachers,
      'finance' => MobileRoute.finance,
      'reports' => MobileRoute.reports,
      'library' => MobileRoute.library,
      'family' => MobileRoute.family,
      'expenses' => MobileRoute.expenses,
      'audit' => MobileRoute.audit,
      _ => null,
    };
  }

  String goPathFor(MobileRoute route) => switch (route) {
        MobileRoute.dashboard => '/app/dashboard',
        MobileRoute.profile => '/app/profile',
        MobileRoute.settings => '/app/settings',
        MobileRoute.messages => '/app/messages',
        MobileRoute.notifications => '/app/notifications',
        MobileRoute.timetable => '/app/timetable',
        MobileRoute.attendance => '/app/attendance',
        MobileRoute.payments => '/app/payments',
        MobileRoute.results => '/app/results',
        MobileRoute.classes => '/app/classes',
        MobileRoute.subjects => '/app/subjects',
        MobileRoute.students => '/app/students',
        MobileRoute.teachers => '/app/teachers',
        MobileRoute.finance => '/app/finance',
        MobileRoute.reports => '/app/reports',
        MobileRoute.library => '/app/library',
        MobileRoute.audit => '/app/audit',
        MobileRoute.family => '/app/family',
        MobileRoute.expenses => '/app/expenses',
        MobileRoute.salaries => '/app/salaries',
      };

  bool _isSuperAdmin(UserProfile user) => user.isRole(AppRoles.superAdmin);
  bool _isAdminLike(UserProfile user) =>
      user.isRole(AppRoles.superAdmin) ||
      user.isRole(AppRoles.admin) ||
      user.isRole(AppRoles.branchManager) ||
      user.isRole(AppRoles.owner);
  bool _isParentLike(UserProfile user) =>
      user.isRole(AppRoles.parent) || user.isRole(AppRoles.familyStudent);
  bool _isFinanceStaff(UserProfile user) =>
      user.isRole(AppRoles.accountant) || _isAdminLike(user);
}
