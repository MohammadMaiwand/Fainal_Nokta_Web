import 'package:equatable/equatable.dart';

import '../../../app/constants.dart';

class UserProfile extends Equatable {
  const UserProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.originalRole,
    this.canonicalRole,
    this.phone,
    this.profileImage,
    this.branchId,
    this.status,
    this.permissionKeys = const [],
    this.permissions = const {},
    this.revokedPermissionKeys = const [],
  });

  final String id;
  final String name;
  final String email;
  /// Raw role stored in the database (e.g. student, family_student).
  final String role;
  final String? originalRole;
  final String? canonicalRole;
  final String? phone;
  final String? profileImage;
  final String? branchId;
  final String? status;
  final List<String> permissionKeys;
  final Map<String, List<String>> permissions;
  final List<String> revokedPermissionKeys;

  /// Role used for navigation and permissions (prefer server canonicalRole).
  String get effectiveRole =>
      canonicalRole ?? normalizeRole(originalRole ?? role) ?? originalRole ?? role;

  static String? normalizeRole(String? role) {
    if (role == null) return null;
    switch (role) {
      case AppRoles.familyStudent:
      case 'family':
        return AppRoles.parent;
      default:
        return role;
    }
  }

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    final permissionsRaw = json['permissions'];
    final permissions = <String, List<String>>{};
    if (permissionsRaw is Map) {
      permissionsRaw.forEach((key, value) {
        if (value is List) {
          permissions['$key'] = value.map((e) => '$e').toList();
        }
      });
    }

    final original = '${json['originalRole'] ?? json['role'] ?? ''}';
    return UserProfile(
      id: '${json['id'] ?? json['_id'] ?? ''}',
      name: '${json['name'] ?? json['fullName'] ?? ''}',
      email: '${json['email'] ?? ''}',
      role: original,
      originalRole: original,
      canonicalRole: (json['canonicalRole'] as String?) ?? (json['role'] as String?),
      phone: json['phone'] as String?,
      profileImage: json['profileImage'] as String?,
      branchId: json['branchId']?.toString(),
      status: json['status'] as String?,
      permissionKeys: (json['permissionKeys'] as List<dynamic>?)
              ?.map((e) => '$e')
              .toList() ??
          const [],
      permissions: permissions,
      revokedPermissionKeys: (json['revokedPermissionKeys'] as List<dynamic>?)
              ?.map((e) => '$e')
              .toList() ??
          const [],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'role': role,
        'originalRole': originalRole ?? role,
        'canonicalRole': canonicalRole,
        'phone': phone,
        'profileImage': profileImage,
        'branchId': branchId,
        'status': status,
        'permissionKeys': permissionKeys,
        'permissions': permissions,
        'revokedPermissionKeys': revokedPermissionKeys,
      };

  bool hasPermissionKey(String key) {
    if (revokedPermissionKeys.contains(key)) return false;
    if (permissionKeys.contains(key)) return true;
    return false;
  }

  bool hasModuleAction(String module, String action) {
    final actions = permissions[module];
    return actions?.contains(action) ?? false;
  }

  bool isRole(String roleToCheck) {
    final normalized = normalizeRole(roleToCheck);
    final candidates = {
      effectiveRole,
      canonicalRole,
      role,
      originalRole,
      normalizeRole(role),
      normalizeRole(originalRole),
    }.whereType<String>().map((r) => r.toLowerCase()).toSet();
    final targets = {roleToCheck, normalized}.whereType<String>().map((r) => r.toLowerCase()).toSet();
    if (candidates.intersection(targets).isNotEmpty) return true;
    if (roleToCheck == AppRoles.student &&
        (candidates.contains(AppRoles.student) || candidates.contains(AppRoles.familyStudent))) {
      return true;
    }
    if (roleToCheck == AppRoles.parent &&
        (candidates.contains(AppRoles.parent) || candidates.contains(AppRoles.familyStudent))) {
      return true;
    }
    return false;
  }

  @override
  List<Object?> get props => [id, email, role, permissionKeys];
}
