import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const rulesPath = path.join(root, 'backend', 'src', 'config', 'systemMasterRules.ts');

const rules = fs.readFileSync(rulesPath, 'utf8');
const roleBlock = rules.match(/rolePermissionMatrix:[\s\S]*?= \{([\s\S]*?)\n\};/)?.[1] ?? '';
const permissionBlock = rules.match(/enterprisePermissions = \[([\s\S]*?)\] as const/)?.[1] ?? '';
const allPermissions = [...permissionBlock.matchAll(/'([^']+)'/g)].map((match) => match[1]);

const roles = ['super_admin', 'admin', 'teacher', 'student', 'parent', 'owner', 'branch_manager', 'system_automation'];
const pathPermissions = {
  '/dashboard': 'DASHBOARD_VIEW',
  '/academic-standards': 'REPORT_VIEW',
  '/enterprise': 'REPORT_VIEW',
  '/branches': 'BRANCH_VIEW',
  '/users': 'USER_VIEW',
  '/students': 'STUDENT_VIEW',
  '/teachers': 'TEACHER_VIEW',
  '/classes': 'CLASS_VIEW',
  '/timetable': 'CLASS_VIEW',
  '/courses': 'COURSE_VIEW',
  '/subjects': 'SUBJECT_VIEW',
  '/attendance': 'ATTENDANCE_VIEW',
  '/exams': 'EXAM_VIEW',
  '/results': 'RESULT_VIEW',
  '/payments': 'PAYMENT_VIEW',
  '/finance': 'FINANCE_VIEW',
  '/expenses': 'EXPENSE_VIEW',
  '/reports': 'REPORT_VIEW',
  '/books': 'RESOURCE_VIEW',
  '/notifications': 'NOTIFICATION_VIEW',
  '/curriculum': 'CURRICULUM_VIEW',
  '/ai-assistant': 'AI_ASSISTANT_USE',
  '/audit': 'AUDIT_VIEW',
  '/roles': 'ROLE_VIEW',
  '/messages': 'MESSAGE_VIEW'
};

function permissionsForRole(role) {
  if (role === 'super_admin') return new Set(allPermissions);
  const start = roleBlock.indexOf(`  ${role}: [`);
  if (start === -1) return new Set();
  const end = roleBlock.indexOf('\n  ]', start);
  const slice = end === -1 ? '' : roleBlock.slice(start, end);
  return new Set([...slice.matchAll(/'([^']+)'/g)].map((item) => item[1]));
}

const report = {};
const failures = [];

for (const role of roles) {
  const permissions = permissionsForRole(role);
  const visiblePaths = Object.entries(pathPermissions)
    .filter(([, permission]) => permissions.has(permission))
    .map(([route]) => route);

  report[role] = visiblePaths;

  for (const route of visiblePaths) {
    const requiredPermission = pathPermissions[route];
    if (!permissions.has(requiredPermission)) {
      failures.push(`${role} can see ${route} without ${requiredPermission}`);
    }
  }
}

const sensitiveExpectations = [
  ['student', '/users'],
  ['student', '/finance'],
  ['student', '/expenses'],
  ['student', '/audit'],
  ['student', '/roles'],
  ['parent', '/users'],
  ['parent', '/finance'],
  ['parent', '/expenses'],
  ['teacher', '/finance'],
  ['teacher', '/audit'],
  ['admin', '/branches'],
  ['system_automation', '/students'],
  ['system_automation', '/teachers'],
  ['system_automation', '/finance']
];

for (const [role, route] of sensitiveExpectations) {
  if (report[role]?.includes(route)) {
    failures.push(`${role} should not see sensitive route ${route}`);
  }
}

console.log(JSON.stringify({ ok: failures.length === 0, report, failures }, null, 2));

if (failures.length) {
  process.exitCode = 1;
}
