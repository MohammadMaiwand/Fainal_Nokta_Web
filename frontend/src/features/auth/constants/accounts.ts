/**
 * Demo credentials for local/staging only.
 * Disabled in production builds unless VITE_ENABLE_DEMO_LOGIN=true.
 * Keep in sync with seeded accounts (account/accounts.md) after a full seed.
 * Each role must match the real account role — do not reuse one email for all roles.
 *
 * Family portal accounts use DB role `family_student`, which normalizes to `parent`.
 * Select "Parent / Family" (والد / عضو خانواده) on login for family1@nokta.com.
 */
export const accounts = {
  super_admin: {
    email: 'admin@gmail.com',
    password: '12345678',
    name: 'Super Admin'
  },
  admin: {
    email: 'admin1@nokta.com',
    password: 'Admin123!',
    name: 'Admin User'
  },
  branch_manager: {
    email: 'librarian1@nokta.com',
    password: 'Librarian123!',
    name: 'Branch Manager'
  },
  teacher: {
    email: 'teacher1@nokta.com',
    password: 'Teacher123!',
    name: 'Teacher User'
  },
  student: {
    email: 'student1@nokta.com',
    password: 'Student123!',
    name: 'Student User'
  },
  parent: {
    email: 'family1@nokta.com',
    password: 'Family123!',
    name: 'Family Member'
  },
  owner: {
    email: '',
    password: '',
    name: 'Owner View'
  }
} as const;

export type AccountRole = keyof typeof accounts;

export const loginRoleOptions: Array<{ value: AccountRole; labelKey: string }> = [
  { value: 'super_admin', labelKey: 'common.super_admin' },
  { value: 'admin', labelKey: 'common.admin' },
  { value: 'owner', labelKey: 'common.owner' },
  { value: 'branch_manager', labelKey: 'common.branch_manager' },
  { value: 'teacher', labelKey: 'common.teacher' },
  { value: 'student', labelKey: 'common.student' },
  { value: 'parent', labelKey: 'common.family_student' }
];

export const isDemoLoginEnabled =
  import.meta.env.DEV || String(import.meta.env.VITE_ENABLE_DEMO_LOGIN ?? '').toLowerCase() === 'true';
