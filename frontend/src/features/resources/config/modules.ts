import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Award,
  Bell,
  BookOpen,
  BrainCircuit,
  Building2,
  CalendarDays,
  CalendarCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  Home,
  MessageSquare,
  Layers,
  ShieldCheck,
  UserCheck,
  Users,
  Wallet
} from 'lucide-react';
import { AfghaniIcon } from '@/components/icons/AfghaniIcon';

export type EnterpriseRole =
  | 'super_admin'
  | 'admin'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'owner'
  | 'branch_manager'
  | 'system_automation';

export type LegacyRole = 'family_student' | 'accountant' | 'librarian' | 'user';
export type Role = EnterpriseRole | LegacyRole;

const roleAliasMap: Record<LegacyRole, EnterpriseRole> = {
  family_student: 'parent',
  accountant: 'admin',
  librarian: 'branch_manager',
  user: 'student'
};

export function normalizeRole(role: Role | null | undefined): EnterpriseRole | null {
  if (!role) return null;
  if (role in roleAliasMap) {
    return roleAliasMap[role as LegacyRole];
  }
  return role as EnterpriseRole;
}

const coreRoles: EnterpriseRole[] = ['super_admin', 'admin', 'teacher', 'student', 'parent', 'owner', 'branch_manager', 'system_automation'];
const roleDeniedPaths: Partial<Record<EnterpriseRole, Set<string>>> = {
  // Hard blocks only for modules never intended for family portal (even with grants).
  parent: new Set(['/courses', '/books', '/curriculum', '/exams']),
  teacher: new Set([
    '/teachers',
    '/families',
    '/payments',
    '/finance',
    '/loans',
    '/expenses',
    '/reports',
    '/users',
    '/audit',
    '/roles',
    '/branches',
    '/academy-financial-report',
    '/enterprise',
    '/academic-standards'
  ])
};

export interface ModuleField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'time' | 'select' | 'textarea' | 'subjectList' | 'classSchedule' | 'file' | 'profileImage';
  required?: boolean;
  options?: { value: string; label: string }[];
  optionsEndpoint?: string;
  optionLabelKey?: string;
  optionValueKey?: string;
  multiple?: boolean;
  placeholder?: string;
  hiddenOnEdit?: boolean;
}

export interface ModuleListField {
  key: string;
  label: string;
  width?: string;
}

export interface ModuleAction {
  label: string;
  patchData: Record<string, any>;
  roles: Role[];
  visibleWhen?: (item: any) => boolean;
}

export interface SummaryCard {
  label: string;
  key: string;
  prefix?: string;
}

export interface ModuleConfig {
  path: string;
  title: string;
  entity: string;
  endpoint: string;
  description?: string;
  fields: ModuleField[];
  listFields: ModuleListField[];
  searchField?: string;
  permissions: {
    view: Role[];
    create?: Role[];
    edit?: Role[];
    delete?: Role[];
  };
  createEndpoint?: string;
  disableEdit?: boolean;
  disableDelete?: boolean;
  type?: 'crud' | 'summary';
  summaryCards?: SummaryCard[];
  actions?: ModuleAction[];
}

const roleOptions = [
  { value: 'super_admin', label: 'common.super_admin' },
  { value: 'admin', label: 'common.admin' },
  { value: 'teacher', label: 'common.teacher' },
  { value: 'student', label: 'common.student' },
  { value: 'parent', label: 'common.parent' },
  { value: 'owner', label: 'common.owner' },
  { value: 'branch_manager', label: 'common.branch_manager' },
  { value: 'system_automation', label: 'common.system_automation' }
];

export const modulesConfig: Record<string, ModuleConfig> = {
  branches: {
    path: '/branches',
    title: 'common.branches',
    entity: 'common.branch',
    endpoint: '/branches',
    fields: [
      { name: 'name', label: 'common.name', type: 'text', required: true },
      { name: 'code', label: 'common.code', type: 'text', required: true, hiddenOnEdit: true },
      { name: 'city', label: 'common.city', type: 'text' },
      { name: 'phone', label: 'common.phone', type: 'text' },
      { name: 'managerId', label: 'common.branch_manager', type: 'select', optionsEndpoint: '/branches/manager-options', optionLabelKey: 'name', optionValueKey: '_id' }
    ],
    listFields: [
      { key: 'name', label: 'common.name' },
      { key: 'code', label: 'common.code' },
      { key: 'city', label: 'common.city' },
      { key: 'phone', label: 'common.phone' },
      { key: 'managerName', label: 'common.branch_manager' }
    ],
    searchField: 'name',
    permissions: {
      view: ['super_admin', 'owner', 'branch_manager'],
      create: ['super_admin'],
      edit: ['super_admin', 'branch_manager'],
      delete: ['super_admin']
    }
  },
  users: {
    path: '/users',
    title: 'common.users',
    entity: 'common.user',
    endpoint: '/users',
    fields: [
      { name: 'name', label: 'common.full_name', type: 'text', required: true },
      { name: 'email', label: 'common.email_address', type: 'email', required: true },
      { name: 'password', label: 'common.password', type: 'password', required: true, hiddenOnEdit: true },
      { name: 'phone', label: 'common.phone', type: 'text' },
      { name: 'profileImage', label: 'common.profile_image', type: 'profileImage' },
      { name: 'branchId', label: 'common.branch', type: 'select', required: true, optionsEndpoint: '/branches', optionLabelKey: 'name', optionValueKey: '_id' },
      { name: 'status', label: 'common.status', type: 'select', options: [
        { value: 'active', label: 'common.active' },
        { value: 'inactive', label: 'common.inactive' },
        { value: 'blocked', label: 'common.blocked' }
      ] },
      { name: 'role', label: 'common.role', type: 'select', required: true, options: roleOptions }
    ],
    listFields: [
      { key: 'name', label: 'common.name', width: '35%' },
      { key: 'email', label: 'common.email', width: '35%' },
      { key: 'phone', label: 'common.phone' },
      { key: 'branchName', label: 'common.branch' },
      { key: 'role', label: 'common.role', width: '30%' }
    ],
    searchField: 'name',
    permissions: {
      view: ['super_admin'],
      create: ['super_admin'],
      edit: ['super_admin'],
      delete: ['super_admin']
    }
  },
  students: {
    path: '/students',
    title: 'common.students',
    entity: 'common.student',
    endpoint: '/students',
    fields: [
      { name: 'firstName', label: 'students.first_name', type: 'text', required: true },
      { name: 'lastName', label: 'students.last_name', type: 'text', required: true },
      { name: 'fatherName', label: 'students.father_name', type: 'text', required: true },
      { name: 'loginEmail', label: 'common.login_email', type: 'email' },
      { name: 'loginPassword', label: 'common.login_password', type: 'password', hiddenOnEdit: true },
      { name: 'profileImage', label: 'common.profile_image', type: 'profileImage' },
      { name: 'phone', label: 'students.phone', type: 'text' },
      { name: 'familyPhone', label: 'students.guardian_phone', type: 'text' },
      { name: 'whatsapp', label: 'common.whatsapp', type: 'text' },
      { name: 'gender', label: 'students.gender', type: 'select', required: true, options: [
        { value: 'male', label: 'students.gender_male' },
        { value: 'female', label: 'students.gender_female' },
        { value: 'other', label: 'students.gender_other' }
      ] },
      { name: 'classId', label: 'students.class', type: 'select', required: true, optionsEndpoint: '/classes', optionLabelKey: 'className', optionValueKey: '_id' },
      { name: 'subjectId', label: 'students.subject', type: 'select', required: true, optionsEndpoint: '/subjects', optionLabelKey: 'title', optionValueKey: '_id' },
      { name: 'teacherId', label: 'students.teacher', type: 'select', required: true, optionsEndpoint: '/teachers', optionLabelKey: 'name', optionValueKey: '_id' },
      { name: 'feeAmount', label: 'students.fee_amount', type: 'number', required: true },
      { name: 'paidAmount', label: 'students.paid_amount', type: 'number' },
      { name: 'registrationStartDate', label: 'common.start_date', type: 'date' },
      { name: 'registrationEndDate', label: 'common.end_date', type: 'date' },
      { name: 'status', label: 'common.status', type: 'select', options: [
        { value: 'active', label: 'common.active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'suspended', label: 'Suspended' },
        { value: 'graduated', label: 'Graduated' }
      ] },
      { name: 'accountStatus', label: 'common.account_status', type: 'select', options: [
        { value: 'active', label: 'common.active' },
        { value: 'warning', label: 'common.warning' },
        { value: 'expired', label: 'common.expired' },
        { value: 'blocked', label: 'common.blocked' }
      ] }
    ],
    listFields: [
      { key: 'studentNumber', label: 'students.roll_no' },
      { key: 'fullName', label: 'common.full_name' },
      { key: 'className', label: 'students.class' },
      { key: 'subjectName', label: 'students.subject' },
      { key: 'teacherName', label: 'students.teacher' },
      { key: 'guardianPhone', label: 'students.guardian_phone' },
      { key: 'studentPhone', label: 'students.phone' },
      { key: 'branchName', label: 'common.branch' },
      { key: 'enrollmentStatus', label: 'common.status' }
    ],
    searchField: 'firstName',
    permissions: {
      view: ['super_admin', 'admin', 'branch_manager', 'teacher', 'student', 'parent'],
      create: ['super_admin', 'admin', 'branch_manager'],
      edit: ['super_admin', 'admin', 'branch_manager'],
      delete: ['super_admin', 'admin']
    }
  },
  teachers: {
    path: '/teachers',
    title: 'common.teachers',
    entity: 'common.teacher',
    endpoint: '/teachers',
    fields: [
      { name: 'name', label: 'common.full_name', type: 'text', required: true },
      { name: 'email', label: 'common.email', type: 'email', required: true },
      { name: 'password', label: 'common.password', type: 'password', required: true, hiddenOnEdit: true },
      { name: 'profileImage', label: 'common.profile_image', type: 'profileImage' },
      { name: 'phone', label: 'students.phone', type: 'text', required: true },
      { name: 'whatsapp', label: 'common.whatsapp', type: 'text' },
      { name: 'address', label: 'common.address', type: 'textarea' },
      { name: 'gender', label: 'students.gender', type: 'select', required: true, options: [
        { value: 'male', label: 'students.gender_male' },
        { value: 'female', label: 'students.gender_female' },
        { value: 'other', label: 'students.gender_other' }
      ] },
      { name: 'salaryType', label: 'students.salary_type', type: 'select', required: true, options: [
        { value: 'fixed', label: 'students.fixed' },
        { value: 'percentage', label: 'students.percentage' },
        { value: 'fixed_plus_percentage', label: 'students.fixed_plus_percentage' }
      ] },
      { name: 'salaryValue', label: 'students.salary_value', type: 'number', required: true },
      { name: 'assignedSubjects', label: 'common.subjects', type: 'select', multiple: true, optionsEndpoint: '/subjects', optionLabelKey: 'title', optionValueKey: '_id' },
      { name: 'assignedClasses', label: 'common.classes', type: 'select', multiple: true, optionsEndpoint: '/classes', optionLabelKey: 'className', optionValueKey: '_id' },
      { name: 'status', label: 'common.status', type: 'select', options: [
        { value: 'active', label: 'common.active' },
        { value: 'inactive', label: 'common.inactive' },
        { value: 'suspended', label: 'common.suspended' }
      ] }
    ],
    listFields: [
      { key: 'name', label: 'common.name' },
      { key: 'email', label: 'common.email' },
      { key: 'phone', label: 'students.phone' },
      { key: 'assignedClassNames', label: 'common.classes' },
      { key: 'assignedSubjectNames', label: 'common.subjects' },
      { key: 'branchName', label: 'common.branch' },
      { key: 'gender', label: 'students.gender' }
    ],
    searchField: 'name',
    permissions: {
      view: ['super_admin', 'admin', 'branch_manager', 'student', 'parent'],
      create: ['super_admin', 'admin', 'branch_manager'],
      edit: ['super_admin', 'admin', 'branch_manager'],
      delete: ['super_admin', 'admin']
    }
  },
  classes: {
    path: '/classes',
    title: 'common.classes',
    entity: 'common.class',
    endpoint: '/classes',
    fields: [
      { name: 'className', label: 'classes.class_name', type: 'text', required: true },
      { name: 'title', label: 'common.title', type: 'text' },
      { name: 'description', label: 'common.description', type: 'textarea' },
      { name: 'category', label: 'common.category', type: 'text' },
      { name: 'imageUrl', label: 'common.image', type: 'file' },
      { name: 'registrationOpen', label: 'common.registration_open', type: 'select', options: [
        { value: 'true', label: 'common.open' },
        { value: 'false', label: 'common.closed' }
      ] },
      { name: 'active', label: 'common.active', type: 'select', options: [
        { value: 'true', label: 'common.active' },
        { value: 'false', label: 'common.inactive' }
      ] },
      { name: 'genderRestriction', label: 'classes.gender_restriction', type: 'select', required: true, options: [
        { value: 'coed', label: 'classes.gender_coed' },
        { value: 'male', label: 'students.gender_male' },
        { value: 'female', label: 'students.gender_female' }
      ] },
      { name: 'feeAmount', label: 'students.fee_amount', type: 'number', required: true },
      { name: 'subjects', label: 'classes.subjects', type: 'subjectList', required: true, placeholder: 'classes.subject_names' },
      { name: 'assignedTeachers', label: 'classes.assigned_teachers', type: 'select', multiple: true, optionsEndpoint: '/teachers', optionLabelKey: 'name', optionValueKey: '_id', placeholder: 'classes.choose_teacher' },
      { name: 'room', label: 'common.room', type: 'text' },
      { name: 'capacity', label: 'classes.capacity', type: 'number' },
      { name: 'startDate', label: 'common.start_date', type: 'date' },
      { name: 'endDate', label: 'common.end_date', type: 'date' },
      { name: 'weeklySchedule', label: 'common.schedule', type: 'classSchedule' }
    ],
    listFields: [
      { key: 'className', label: 'classes.class_name' },
      { key: 'classCode', label: 'classes.class_code' },
      { key: 'genderRestriction', label: 'classes.gender_restriction' },
      { key: 'feeAmount', label: 'students.fee_amount' },
      { key: 'studentCount', label: 'students.students_count' }
    ],
    searchField: 'className',
    permissions: {
      view: ['super_admin', 'admin', 'branch_manager', 'teacher', 'student', 'parent', 'owner'],
      create: ['super_admin', 'admin', 'branch_manager'],
      edit: ['super_admin', 'admin', 'branch_manager'],
      delete: ['super_admin']
    }
  },
  timetable: {
    path: '/timetable',
    title: 'common.timetable',
    entity: 'common.timetable_item',
    endpoint: '/timetable',
    description: 'common.timetable_description',
    fields: [
      { name: 'classId', label: 'students.class', type: 'select', required: true, optionsEndpoint: '/classes', optionLabelKey: 'className', optionValueKey: '_id' },
      { name: 'subjectId', label: 'common.subject', type: 'select', required: true, optionsEndpoint: '/subjects', optionLabelKey: 'title', optionValueKey: '_id' },
      { name: 'teacherId', label: 'common.teacher', type: 'select', required: true, optionsEndpoint: '/teachers', optionLabelKey: 'name', optionValueKey: '_id' },
      { name: 'dayOfWeek', label: 'common.day_of_week', type: 'select', required: true, options: [
        { value: 'saturday', label: 'common.saturday' },
        { value: 'sunday', label: 'common.sunday' },
        { value: 'monday', label: 'common.monday' },
        { value: 'tuesday', label: 'common.tuesday' },
        { value: 'wednesday', label: 'common.wednesday' },
        { value: 'thursday', label: 'common.thursday' },
        { value: 'friday', label: 'common.friday' }
      ] },
      { name: 'startTime', label: 'common.start_time', type: 'text', required: true },
      { name: 'endTime', label: 'common.end_time', type: 'text', required: true },
      { name: 'room', label: 'common.room', type: 'text' },
      { name: 'deliveryMode', label: 'common.delivery_mode', type: 'select', options: [
        { value: 'in_person', label: 'common.in_person' },
        { value: 'online', label: 'common.online' },
        { value: 'hybrid', label: 'common.hybrid' }
      ] },
      { name: 'onlineLink', label: 'common.online_link', type: 'text' },
      { name: 'notes', label: 'common.notes', type: 'textarea' }
    ],
    listFields: [
      { key: 'className', label: 'classes.class_name' },
      { key: 'subjectName', label: 'subjects.title' },
      { key: 'teacherName', label: 'subjects.teacher' },
      { key: 'dayOfWeek', label: 'common.day_of_week' },
      { key: 'startTime', label: 'common.start_time' },
      { key: 'endTime', label: 'common.end_time' },
      { key: 'room', label: 'common.room' }
    ],
    searchField: 'room',
    permissions: {
      view: ['super_admin', 'admin', 'branch_manager', 'teacher', 'student', 'owner'],
      create: ['super_admin', 'admin', 'branch_manager'],
      edit: ['super_admin', 'admin', 'branch_manager'],
      delete: ['super_admin', 'admin', 'branch_manager']
    }
  },
  subjects: {
    path: '/subjects',
    title: 'common.subjects',
    entity: 'common.subject',
    endpoint: '/subjects',
    fields: [
      { name: 'title', label: 'subjects.title', type: 'text', required: true },
      { name: 'code', label: 'subjects.code', type: 'text', required: true },
      { name: 'classId', label: 'subjects.class', type: 'select', required: true, optionsEndpoint: '/classes', optionLabelKey: 'className', optionValueKey: '_id' },
      { name: 'feeAmount', label: 'subjects.fee_amount', type: 'number', required: true },
      { name: 'teacher', label: 'subjects.teacher', type: 'select', optionsEndpoint: '/teachers', optionLabelKey: 'name', optionValueKey: '_id' },
      { name: 'description', label: 'subjects.description', type: 'textarea' }
    ],
    listFields: [
      { key: 'title', label: 'subjects.title' },
      { key: 'code', label: 'subjects.code' },
      { key: 'className', label: 'subjects.class_name' },
      { key: 'teacherName', label: 'subjects.teacher' }
    ],
    searchField: 'title',
    permissions: {
      view: ['super_admin', 'admin', 'branch_manager', 'teacher', 'student', 'parent'],
      create: ['super_admin', 'admin', 'branch_manager'],
      edit: ['super_admin', 'admin', 'branch_manager'],
      delete: ['super_admin']
    }
  },
  courses: {
    path: '/courses',
    title: 'common.courses',
    entity: 'common.course',
    endpoint: '/courses',
    description: 'common.courses_description',
    fields: [
      { name: 'title', label: 'common.title', type: 'text', required: true },
      { name: 'slug', label: 'common.slug', type: 'text', required: true, hiddenOnEdit: true },
      { name: 'description', label: 'common.description', type: 'textarea' },
      { name: 'duration', label: 'common.duration', type: 'text' },
      { name: 'fee', label: 'common.fee', type: 'number' },
      { name: 'instructor', label: 'common.instructor', type: 'select', optionsEndpoint: '/teachers', optionLabelKey: 'name', optionValueKey: '_id' },
      { name: 'subjects', label: 'common.subjects', type: 'select', multiple: true, optionsEndpoint: '/subjects', optionLabelKey: 'title', optionValueKey: '_id' },
      { name: 'schedule', label: 'common.schedule', type: 'text' },
      { name: 'capacity', label: 'common.capacity', type: 'number' },
      { name: 'enrollmentStatus', label: 'common.enrollment_status', type: 'select', options: [
        { value: 'open', label: 'common.open' },
        { value: 'closed', label: 'common.closed' },
        { value: 'waitlist', label: 'common.waitlist' }
      ] },
      { name: 'imageUrl', label: 'common.image_upload', type: 'file' },
      { name: 'academicCategory', label: 'common.academic_category', type: 'text' },
      { name: 'startDate', label: 'common.start_date', type: 'date' },
      { name: 'endDate', label: 'common.end_date', type: 'date' },
      { name: 'requirements', label: 'common.requirements', type: 'textarea' },
      { name: 'learningOutcomes', label: 'common.learning_outcomes', type: 'textarea' },
      { name: 'language', label: 'common.language', type: 'select', options: [
        { value: 'multilingual', label: 'common.multilingual' },
        { value: 'en', label: 'common.english' },
        { value: 'fa', label: 'common.dari' },
        { value: 'ps', label: 'common.pashto' }
      ] },
      { name: 'visibility', label: 'common.visibility', type: 'select', options: [
        { value: 'public', label: 'common.public' },
        { value: 'private', label: 'common.private' }
      ] },
      { name: 'status', label: 'common.status', type: 'select', options: [
        { value: 'draft', label: 'common.draft' },
        { value: 'active', label: 'common.active' },
        { value: 'archived', label: 'common.archived' }
      ] },
      { name: 'featured', label: 'common.featured', type: 'select', options: [
        { value: 'true', label: 'common.yes' },
        { value: 'false', label: 'common.no' }
      ] }
    ],
    listFields: [
      { key: 'titleText', label: 'common.title' },
      { key: 'instructorName', label: 'common.instructor' },
      { key: 'duration', label: 'common.duration' },
      { key: 'fee', label: 'common.fee' },
      { key: 'enrollmentStatus', label: 'common.enrollment_status' },
      { key: 'status', label: 'common.status' }
    ],
    searchField: 'titleText',
    permissions: {
      view: ['super_admin', 'admin', 'branch_manager', 'owner', 'teacher'],
      create: ['super_admin', 'admin', 'branch_manager', 'owner'],
      edit: ['super_admin', 'admin', 'branch_manager', 'owner'],
      delete: ['super_admin', 'admin', 'owner']
    }
  },
  attendance: {
    path: '/attendance',
    title: 'common.attendance',
    entity: 'common.attendance_record',
    endpoint: '/attendance',
    fields: [
      { name: 'studentId', label: 'results.student', type: 'select', required: true, optionsEndpoint: '/students', optionLabelKey: 'studentDisplay.fullName', optionValueKey: '_id' },
      { name: 'classId', label: 'students.class', type: 'select', required: true, optionsEndpoint: '/classes', optionLabelKey: 'className', optionValueKey: '_id' },
      { name: 'attendanceDate', label: 'common.date', type: 'date', required: true },
      { name: 'session', label: 'attendance.session', type: 'select', required: true, options: [
        { value: 'morning', label: 'attendance.session_morning' },
        { value: 'afternoon', label: 'attendance.session_afternoon' },
        { value: 'evening', label: 'attendance.session_evening' },
        { value: 'online', label: 'attendance.session_online' }
      ] },
      { name: 'status', label: 'attendance.status', type: 'select', required: true, options: [
        { value: 'present', label: 'attendance.present' },
        { value: 'absent', label: 'attendance.absent' },
        { value: 'late', label: 'attendance.late' },
        { value: 'excused', label: 'attendance.excused' }
      ] }
    ],
    listFields: [
      { key: 'studentName', label: 'results.student' },
      { key: 'className', label: 'students.class' },
      { key: 'attendanceDate', label: 'common.date' },
      { key: 'session', label: 'attendance.session' },
      { key: 'status', label: 'attendance.status' }
    ],
    permissions: {
      view: ['super_admin', 'admin', 'branch_manager', 'teacher', 'student', 'parent', 'owner'],
      create: ['super_admin', 'admin', 'branch_manager', 'teacher'],
      edit: [],
      delete: []
    },
    disableEdit: true,
    disableDelete: true
  },
  exams: {
    path: '/exams',
    title: 'common.exams',
    entity: 'common.exam',
    endpoint: '/exams',
    fields: [
      { name: 'title', label: 'exams.title', type: 'text', required: true },
      { name: 'class', label: 'exams.class', type: 'select', required: true, optionsEndpoint: '/classes', optionLabelKey: 'className', optionValueKey: '_id' },
      { name: 'subject', label: 'exams.subject', type: 'select', required: true, optionsEndpoint: '/subjects', optionLabelKey: 'title', optionValueKey: '_id' },
      { name: 'teacherId', label: 'students.teacher', type: 'select', optionsEndpoint: '/teachers', optionLabelKey: 'name', optionValueKey: '_id' },
      { name: 'date', label: 'exams.date', type: 'date', required: true },
      { name: 'startTime', label: 'common.start_time', type: 'time' },
      { name: 'endTime', label: 'common.end_time', type: 'time' },
      { name: 'durationMinutes', label: 'common.duration_minutes', type: 'number' },
      { name: 'totalMarks', label: 'exams.total_marks', type: 'number' },
      { name: 'onlineExamUrl', label: 'common.online_exam_url', type: 'text' },
      { name: 'googleFormUrl', label: 'common.google_form_url', type: 'text' }
    ],
    listFields: [
      { key: 'title', label: 'exams.title' },
      { key: 'subjectName', label: 'exams.subject' },
      { key: 'className', label: 'exams.class' },
      { key: 'teacherName', label: 'students.teacher' },
      { key: 'date', label: 'exams.date' },
      { key: 'onlineExamUrl', label: 'common.online_exam_url' },
      { key: 'googleFormUrl', label: 'common.google_form_url' }
    ],
    permissions: {
      view: ['super_admin', 'admin', 'branch_manager', 'teacher', 'student', 'owner'],
      create: ['super_admin', 'admin', 'branch_manager', 'teacher'],
      edit: ['super_admin', 'admin', 'branch_manager', 'teacher'],
      delete: ['super_admin', 'admin']
    }
  },
  results: {
    path: '/results',
    title: 'common.results',
    entity: 'common.result',
    endpoint: '/results',
    fields: [
      { name: 'student', label: 'results.student', type: 'select', required: true, optionsEndpoint: '/students', optionLabelKey: 'studentDisplay.fullName', optionValueKey: '_id' },
      { name: 'exam', label: 'results.exam', type: 'select', required: true, optionsEndpoint: '/exams', optionLabelKey: 'title', optionValueKey: '_id' },
      { name: 'score', label: 'results.score', type: 'number', required: true },
      { name: 'gradedBy', label: 'results.graded_by', type: 'select', optionsEndpoint: '/teachers', optionLabelKey: 'name', optionValueKey: '_id' }
    ],
    listFields: [
      { key: 'studentName', label: 'results.student' },
      { key: 'examName', label: 'results.exam' },
      { key: 'subjectName', label: 'exams.subject' },
      { key: 'className', label: 'exams.class' },
      { key: 'teacherName', label: 'students.teacher' },
      { key: 'score', label: 'results.score' },
      { key: 'grade', label: 'results.grade' },
      { key: 'aiRecommendationMessage', label: 'common.ai_recommendation' }
    ],
    permissions: {
      view: ['super_admin', 'admin', 'branch_manager', 'teacher', 'student', 'parent', 'owner'],
      create: ['super_admin', 'admin', 'branch_manager', 'teacher'],
      edit: [],
      delete: []
    },
    disableEdit: true,
    disableDelete: true
  },
  payments: {
    path: '/payments',
    title: 'common.payments',
    entity: 'common.payment',
    endpoint: '/payments',
    fields: [
      { name: 'paymentFor', label: 'payments.payment_type', type: 'select', required: true, options: [
        { value: 'student_fee', label: 'payments.payment_type_student_fee' },
        { value: 'teacher_salary', label: 'finance.teacher_salaries' },
        { value: 'manager_salary', label: 'payments.payment_type_employee_salary' }
      ] },
      { name: 'studentId', label: 'results.student', type: 'select', optionsEndpoint: '/students', optionLabelKey: 'studentDisplay.fullName', optionValueKey: '_id' },
      { name: 'payeeUserId', label: 'payments.employee_role', type: 'select', optionsEndpoint: '/payments/payees', optionLabelKey: 'label', optionValueKey: 'value' },
      { name: 'payeeRole', label: 'payments.employee_role', type: 'select', options: [
        { value: 'teacher', label: 'common.teacher' },
        { value: 'manager', label: 'common.branch_manager' }
      ] },
      { name: 'amount', label: 'finance.amount', type: 'number', required: true },
      { name: 'method', label: 'payments.method', type: 'select', required: true, options: [
        { value: 'cash', label: 'payments.method_cash' },
        { value: 'bank_transfer', label: 'payments.method_bank' },
        { value: 'mobile_money', label: 'payments.method_mobile' },
        { value: 'card', label: 'payments.method_card' }
      ] },
      { name: 'referenceNumber', label: 'payments.reference', type: 'text' },
      { name: 'notes', label: 'finance.notes', type: 'textarea' }
    ],
    listFields: [
      { key: 'paymentFor', label: 'payments.payment_type' },
      { key: 'studentRollNo', label: 'students.roll_no' },
      { key: 'studentName', label: 'results.student' },
      { key: 'payeeName', label: 'payments.employee_role' },
      { key: 'payeeRole', label: 'common.role' },
      { key: 'grossAmount', label: 'payments.gross_amount' },
      { key: 'taxAmount', label: 'payments.tax_amount' },
      { key: 'netAmount', label: 'payments.net_payment' },
      { key: 'remainingSalaryBalance', label: 'payments.remaining_balance' },
      { key: 'className', label: 'students.class' },
      { key: 'subjectName', label: 'students.subject' },
      { key: 'teacherName', label: 'students.teacher' },
      { key: 'guardianPhone', label: 'students.guardian_phone' },
      { key: 'invoiceNumber', label: 'payments.reference' },
      { key: 'amount', label: 'finance.amount' },
      { key: 'method', label: 'payments.method' },
      { key: 'paymentDate', label: 'common.date' }
    ],
    permissions: {
      view: ['super_admin', 'admin', 'branch_manager', 'owner', 'student', 'parent'],
      create: ['super_admin', 'admin', 'branch_manager', 'owner'],
      edit: [],
      delete: []
    },
    disableEdit: true,
    disableDelete: true
  },
  finance: {
    path: '/finance',
    title: 'common.finance',
    entity: 'common.finance',
    endpoint: '/finance',
    createEndpoint: '/finance/income',
    fields: [
      { name: 'title', label: 'finance.title', type: 'text', required: true },
      { name: 'amount', label: 'finance.amount', type: 'number', required: true },
      { name: 'category', label: 'finance.category', type: 'text', required: true },
      { name: 'date', label: 'finance.date', type: 'date' },
      { name: 'notes', label: 'finance.notes', type: 'textarea' }
    ],
    listFields: [
      { key: 'title', label: 'finance.title' },
      { key: 'amount', label: 'finance.amount' },
      { key: 'category', label: 'finance.category' },
      { key: 'date', label: 'finance.date' }
    ],
    permissions: {
      view: ['super_admin', 'admin', 'branch_manager', 'owner'],
      create: ['super_admin', 'admin', 'branch_manager'],
      edit: ['super_admin', 'admin', 'branch_manager'],
      delete: ['super_admin', 'admin']
    }
  },
  reports: {
    path: '/reports',
    title: 'common.reports',
    entity: 'common.report',
    endpoint: '/reports',
    fields: [],
    listFields: [
      { key: 'title', label: 'finance.title' },
      { key: 'type', label: 'common.type' },
      { key: 'periodKey', label: 'common.period' },
      { key: 'status', label: 'common.status' }
    ],
    permissions: {
      view: ['super_admin', 'admin', 'branch_manager', 'owner']
    },
    disableEdit: true,
    disableDelete: true
  },
  expenses: {
    path: '/expenses',
    title: 'common.expenses',
    entity: 'common.expense',
    endpoint: '/expenses',
    fields: [
      { name: 'title', label: 'finance.title', type: 'text', required: true },
      { name: 'amount', label: 'finance.amount', type: 'number', required: true },
      { name: 'category', label: 'finance.category', type: 'text', required: true },
      { name: 'date', label: 'finance.date', type: 'date' },
      { name: 'notes', label: 'finance.notes', type: 'textarea' }
    ],
    listFields: [
      { key: 'title', label: 'finance.title' },
      { key: 'amount', label: 'finance.amount' },
      { key: 'category', label: 'finance.category' },
      { key: 'date', label: 'finance.date' }
    ],
    permissions: {
      view: ['super_admin', 'admin', 'branch_manager', 'owner'],
      create: ['super_admin', 'admin', 'branch_manager'],
      edit: ['super_admin', 'admin', 'branch_manager'],
      delete: ['super_admin', 'admin']
    }
  },
  families: {
    path: '/families',
    title: 'common.families',
    entity: 'common.family',
    endpoint: '/families',
    fields: [
      { name: 'guardianName', label: 'common.guardian_name', type: 'text', required: true },
      { name: 'guardianEmail', label: 'common.guardian_email', type: 'email', required: true },
      { name: 'guardianPhone', label: 'common.guardian_phone', type: 'text', required: true },
      { name: 'notes', label: 'finance.notes', type: 'textarea' }
    ],
    listFields: [
      { key: 'guardianName', label: 'common.guardian_name' },
      { key: 'guardianEmail', label: 'common.guardian_email' },
      { key: 'guardianPhone', label: 'common.guardian_phone' }
    ],
    permissions: {
      view: ['super_admin', 'admin', 'branch_manager', 'parent', 'owner'],
      create: ['super_admin', 'admin', 'branch_manager'],
      edit: [],
      delete: []
    },
    disableEdit: true,
    disableDelete: true
  },
  books: {
    path: '/books',
    title: 'common.books',
    entity: 'common.book',
    endpoint: '/books',
    description: 'common.books_description',
    fields: [
      { name: 'title', label: 'common.title', type: 'text', required: true },
      { name: 'author', label: 'common.author', type: 'text' },
      { name: 'isbn', label: 'common.isbn', type: 'text', required: true },
      { name: 'category', label: 'common.category', type: 'text' },
      { name: 'stockQuantity', label: 'common.stock_quantity', type: 'number', required: true },
      { name: 'price', label: 'common.price', type: 'number', required: true },
      { name: 'description', label: 'common.description', type: 'textarea' }
    ],
    listFields: [
      { key: 'title', label: 'common.title' },
      { key: 'author', label: 'common.author' },
      { key: 'isbn', label: 'common.isbn' },
      { key: 'category', label: 'common.category' },
      { key: 'stockQuantity', label: 'common.stock_quantity' },
      { key: 'price', label: 'common.price' }
    ],
    searchField: 'title',
    permissions: {
      view: ['super_admin', 'admin', 'branch_manager', 'teacher', 'owner'],
      create: ['super_admin', 'admin', 'branch_manager'],
      edit: ['super_admin', 'admin', 'branch_manager'],
      delete: ['super_admin']
    }
  },
  notifications: {
    path: '/notifications',
    title: 'common.notifications',
    entity: 'common.notification',
    endpoint: '/notifications',
    fields: [
      { name: 'title', label: 'notifications.title', type: 'text', required: true },
      { name: 'description', label: 'common.description', type: 'textarea', required: true },
      { name: 'classId', label: 'students.class', type: 'select', optionsEndpoint: '/classes', optionLabelKey: 'className', optionValueKey: '_id' },
      { name: 'subjectId', label: 'students.subject', type: 'select', optionsEndpoint: '/subjects', optionLabelKey: 'title', optionValueKey: '_id' },
      { name: 'teacherId', label: 'students.teacher', type: 'select', optionsEndpoint: '/teachers', optionLabelKey: 'name', optionValueKey: '_id' },
      { name: 'category', label: 'common.category', type: 'select', options: [
        { value: 'general', label: 'common.general' },
        { value: 'holiday', label: 'common.holiday' },
        { value: 'emergency', label: 'common.emergency' },
        { value: 'class_notice', label: 'common.class_notice' },
        { value: 'academic_reminder', label: 'common.academic_reminder' },
        { value: 'event_update', label: 'common.event_update' },
        { value: 'exam_alert', label: 'common.exam_alert' }
      ] },
      { name: 'publishDate', label: 'common.date', type: 'date' },
      { name: 'expiresAt', label: 'common.expiration_date', type: 'date' },
      { name: 'priority', label: 'common.priority', type: 'select', options: [
        { value: 'low', label: 'common.low' },
        { value: 'normal', label: 'common.normal' },
        { value: 'high', label: 'common.high' },
        { value: 'urgent', label: 'common.urgent' }
      ] },
      { name: 'pinned', label: 'common.pinned', type: 'select', options: [
        { value: 'true', label: 'common.yes' },
        { value: 'false', label: 'common.no' }
      ] },
      { name: 'publishStatus', label: 'notifications.publish_status', type: 'select', required: true, options: [
        { value: 'draft', label: 'notifications.status_draft' },
        { value: 'published', label: 'notifications.status_published' }
      ] },
      { name: 'recipientRoles', label: 'notifications.recipient_roles', type: 'select', options: roleOptions, multiple: true }
    ],
    listFields: [
      { key: 'title', label: 'notifications.title' },
      { key: 'description', label: 'common.description' },
      { key: 'className', label: 'students.class' },
      { key: 'subjectName', label: 'students.subject' },
      { key: 'teacherName', label: 'students.teacher' },
      { key: 'category', label: 'common.category' },
      { key: 'priority', label: 'common.priority' },
      { key: 'publishDate', label: 'common.date' },
      { key: 'publishStatus', label: 'common.status' }
    ],
    permissions: {
      view: ['super_admin', 'admin', 'branch_manager', 'teacher', 'student', 'parent', 'owner'],
      create: ['super_admin', 'admin', 'branch_manager', 'teacher', 'owner'],
      edit: ['super_admin', 'admin', 'branch_manager', 'teacher', 'owner'],
      delete: ['super_admin', 'admin', 'branch_manager', 'owner']
    }
  },
  curriculum: {
    path: '/curriculum',
    title: 'common.curriculum',
    entity: 'common.curriculum_item',
    endpoint: '/curriculum',
    description: 'common.curriculum_description',
    fields: [
      { name: 'title', label: 'common.title', type: 'text', required: true },
      { name: 'code', label: 'common.code', type: 'text', required: true },
      { name: 'level', label: 'common.level', type: 'text' },
      { name: 'academicYear', label: 'common.academic_year', type: 'text' },
      { name: 'term', label: 'common.term', type: 'select', options: [
        { value: 'annual', label: 'common.annual' },
        { value: 'semester_1', label: 'common.semester_1' },
        { value: 'semester_2', label: 'common.semester_2' },
        { value: 'quarter_1', label: 'common.quarter_1' },
        { value: 'quarter_2', label: 'common.quarter_2' },
        { value: 'quarter_3', label: 'common.quarter_3' },
        { value: 'quarter_4', label: 'common.quarter_4' }
      ] },
      { name: 'classId', label: 'students.class', type: 'select', optionsEndpoint: '/classes', optionLabelKey: 'className', optionValueKey: '_id' },
      { name: 'subjectId', label: 'students.subject', type: 'select', optionsEndpoint: '/subjects', optionLabelKey: 'title', optionValueKey: '_id' },
      { name: 'weeklyHours', label: 'common.weekly_hours', type: 'number' },
      { name: 'durationWeeks', label: 'common.duration_weeks', type: 'number' },
      { name: 'objectives', label: 'common.objectives', type: 'textarea', required: true },
      { name: 'learningOutcomes', label: 'common.learning_outcomes', type: 'textarea', required: true },
      { name: 'standards', label: 'common.standards', type: 'textarea' },
      { name: 'scopeSequence', label: 'common.scope_sequence', type: 'textarea' },
      { name: 'assessmentPlan', label: 'common.assessment_plan', type: 'textarea' },
      { name: 'resources', label: 'common.resources', type: 'textarea' },
      { name: 'status', label: 'common.status', type: 'select', options: [
        { value: 'draft', label: 'common.draft' },
        { value: 'approved', label: 'common.approved' },
        { value: 'archived', label: 'common.archived' }
      ] }
    ],
    listFields: [
      { key: 'title', label: 'common.title' },
      { key: 'code', label: 'common.code' },
      { key: 'className', label: 'students.class' },
      { key: 'subjectName', label: 'students.subject' },
      { key: 'academicYear', label: 'common.academic_year' },
      { key: 'status', label: 'common.status' }
    ],
    searchField: 'title',
    permissions: {
      view: coreRoles,
      create: ['super_admin', 'admin', 'branch_manager'],
      edit: ['super_admin', 'admin', 'branch_manager'],
      delete: ['super_admin', 'admin']
    }
  },
  audit: {
    path: '/audit',
    title: 'common.audit_logs',
    entity: 'common.audit',
    endpoint: '/audit',
    fields: [],
    listFields: [
      { key: 'action', label: 'audit.action' },
      { key: 'type', label: 'common.type' },
      { key: 'severity', label: 'common.severity' },
      { key: 'createdAt', label: 'audit.created_at' }
    ],
    permissions: {
      view: ['super_admin', 'admin', 'owner', 'branch_manager']
    },
    disableEdit: true,
    disableDelete: true
  },
  messages: {
    path: '/messages',
    title: 'messages.title',
    entity: 'messages.title',
    endpoint: '/messages',
    fields: [],
    listFields: [],
    permissions: {
      view: ['super_admin', 'admin', 'branch_manager', 'teacher', 'student', 'parent', 'owner'],
      create: ['super_admin', 'admin', 'branch_manager', 'teacher', 'student', 'parent', 'owner']
    },
    disableEdit: true,
    disableDelete: true
  },
  roles: {
    path: '/roles',
    title: 'common.roles',
    entity: 'common.role',
    endpoint: '/roles',
    fields: [],
    listFields: [
      { key: 'role', label: 'roles.role' }
    ],
    permissions: {
      view: ['super_admin', 'owner']
    },
    disableEdit: true,
    disableDelete: true
  },
  payroll: {
    path: '/payroll',
    title: 'common.payroll_tax',
    entity: 'common.payroll_tax',
    endpoint: '/payroll',
    fields: [],
    listFields: [],
    permissions: {
      view: ['super_admin', 'admin', 'branch_manager', 'owner', 'teacher'],
      create: ['super_admin', 'admin', 'branch_manager', 'owner'],
      edit: ['super_admin', 'admin', 'branch_manager', 'owner'],
      delete: []
    },
    disableEdit: true,
    disableDelete: true
  },
  academyFinancialReport: {
    path: '/academy-financial-report',
    title: 'common.academy_financial_report',
    entity: 'common.academy_financial_report',
    endpoint: '/academy-financial-report',
    fields: [],
    listFields: [],
    permissions: {
      view: ['super_admin', 'admin', 'branch_manager', 'owner'],
      create: [],
      edit: [],
      delete: []
    },
    disableEdit: true,
    disableDelete: true
  }
};

export interface MenuItem {
  path: string;
  label: string;
  icon: LucideIcon;
  roles: EnterpriseRole[];
}

export interface AccessProfile {
  role?: Role | null;
  permissions?: Record<string, string[]>;
  permissionKeys?: string[];
  revokedPermissionKeys?: string[];
}

const disabledSystemPaths = new Set<string>();

const modulePermissionPrefixMap: Record<string, string> = {
  dashboard: 'DASHBOARD',
  'academic-standards': 'REPORT',
  enterprise: 'REPORT',
  users: 'USER',
  students: 'STUDENT',
  teachers: 'TEACHER',
  classes: 'CLASS',
  timetable: 'CLASS',
  subjects: 'SUBJECT',
  courses: 'COURSE',
  curriculum: 'CURRICULUM',
  attendance: 'ATTENDANCE',
  exams: 'EXAM',
  results: 'RESULT',
  payments: 'PAYMENT',
  finance: 'FINANCE',
  loans: 'LOAN',
  expenses: 'EXPENSE',
  payroll: 'SALARY',
  'academy-financial-report': 'REPORT',
  families: 'FAMILY_LINK',
  books: 'RESOURCE',
  notifications: 'NOTIFICATION',
  reports: 'REPORT',
  audit: 'AUDIT',
  roles: 'ROLE',
  messages: 'MESSAGE',
  permissions: 'PERMISSION',
  branches: 'BRANCH',
  'ai-assistant': 'AI_ASSISTANT'
};

const enterpriseActionMap: Record<string, string> = {
  read: 'VIEW',
  create: 'CREATE',
  update: 'UPDATE',
  delete: 'DELETE'
};

const moduleActionPermissionOverrides: Record<string, Partial<Record<string, string>>> = {
  books: {
    delete: 'RESOURCE_UPDATE'
  },
  finance: {
    create: 'FINANCE_CREATE',
    update: 'FINANCE_AUDIT',
    delete: 'FINANCE_AUDIT'
  },
  loans: {
    read: 'LOAN_VIEW',
    create: 'LOAN_CREATE',
    update: 'LOAN_APPROVE',
    delete: 'LOAN_AUDIT'
  },
  reports: {
    create: 'REPORT_GENERATE',
    update: 'REPORT_GENERATE',
    delete: 'REPORT_GENERATE'
  },
  roles: {
    create: 'ROLE_MANAGE',
    update: 'ROLE_MANAGE',
    delete: 'ROLE_MANAGE'
  },
  permissions: {
    create: 'PERMISSION_MANAGE',
    update: 'PERMISSION_MANAGE',
    delete: 'PERMISSION_MANAGE'
  },
  audit: {
    create: 'AUDIT_VIEW',
    update: 'AUDIT_VIEW',
    delete: 'AUDIT_VIEW'
  },
  'ai-assistant': {
    read: 'AI_ASSISTANT_USE'
  },
  'academic-standards': {
    read: 'REPORT_VIEW'
  },
  enterprise: {
    read: 'REPORT_VIEW',
    create: 'AUDIT_VIEW',
    update: 'CLASS_UPDATE',
    delete: 'AUDIT_VIEW'
  }
};

const legacyModuleAliases: Record<string, string[]> = {
  users: ['users', 'user'],
  students: ['students', 'student'],
  teachers: ['teachers', 'teacher'],
  classes: ['classes', 'class'],
  timetable: ['timetable', 'schedule', 'class_schedule', 'classes', 'class'],
  subjects: ['subjects', 'subject'],
  courses: ['courses', 'course'],
  exams: ['exams', 'exam'],
  results: ['results', 'result'],
  payments: ['payments', 'payment', 'finance'],
  finance: ['finance', 'payment', 'payments'],
  expenses: ['expenses', 'expense'],
  payroll: ['payroll', 'salary', 'tax'],
  'academy-financial-report': ['academy_financial_report', 'financial_report', 'reports'],
  families: ['families', 'family', 'family_link'],
  books: ['books', 'resource', 'resources'],
  notifications: ['notifications', 'notification'],
  reports: ['reports', 'report'],
  roles: ['roles', 'role'],
  permissions: ['permissions', 'permission'],
  branches: ['branches', 'branch'],
  'academic-standards': ['academic_standards', 'reports', 'report'],
  enterprise: ['enterprise', 'dashboard', 'audit', 'reports'],
  'ai-assistant': ['ai_assistant', 'ai-assistant']
};

const pathModuleMap: Record<string, string> = Object.fromEntries(
  Object.values(modulesConfig).map((config) => [config.path, config.endpoint.replace(/^\//, '')])
);

pathModuleMap['/dashboard'] = 'dashboard';
pathModuleMap['/dashboard/manage-users'] = 'users';
pathModuleMap['/dashboard/super-admin'] = 'dashboard';
pathModuleMap['/dashboard/super-admin/master'] = 'dashboard';
pathModuleMap['/users'] = 'users';
pathModuleMap['/academic-standards'] = 'academic-standards';
pathModuleMap['/enterprise'] = 'enterprise';
pathModuleMap['/ai-assistant'] = 'ai-assistant';
pathModuleMap['/settings'] = 'dashboard';
pathModuleMap['/profile'] = 'dashboard';
pathModuleMap['/messages'] = 'messages';
pathModuleMap['/payroll'] = 'payroll';
pathModuleMap['/academy-financial-report'] = 'academy-financial-report';
pathModuleMap['/loans'] = 'loans';

function getModuleFromPath(pathname: string) {
  return pathModuleMap[pathname] ?? pathname.replace(/^\//, '').split('/')[0];
}

export function getModuleConfigByPath(pathname: string): ModuleConfig | undefined {
  const moduleKey = getModuleFromPath(pathname);
  return modulesConfig[moduleKey];
}

export function superAdminModuleActions(pathname: string) {
  const dedicatedPages = new Set(['/roles', '/messages', '/attendance', '/timetable', '/finance', '/loans', '/payments', '/reports', '/payroll']);
  if (dedicatedPages.has(pathname)) {
    return { canEdit: true, canDelete: false };
  }

  const config = getModuleConfigByPath(pathname);
  if (!config) {
    return { canEdit: true, canDelete: false };
  }

  const canEdit = !config.disableEdit && config.fields.length > 0;
  const canDelete = !config.disableDelete && Boolean(config.permissions.delete?.includes('super_admin'));

  return { canEdit, canDelete };
}

function hasEnterprisePermission(user: AccessProfile | null | undefined, moduleKey: string, action: string) {
  const granted = new Set(user?.permissionKeys ?? []);
  const revoked = new Set(user?.revokedPermissionKeys ?? []);
  if (granted.has('*')) {
    const overrideKey = moduleActionPermissionOverrides[moduleKey]?.[action];
    if (overrideKey) return !revoked.has(overrideKey);
    const prefix = modulePermissionPrefixMap[moduleKey];
    const suffix = enterpriseActionMap[action];
    if (!prefix || !suffix) return true;
    return !revoked.has(`${prefix}_${suffix}`);
  }

  const overrideKey = moduleActionPermissionOverrides[moduleKey]?.[action];
  if (overrideKey) {
    return granted.has(overrideKey) && !revoked.has(overrideKey);
  }

  const prefix = modulePermissionPrefixMap[moduleKey];
  const suffix = enterpriseActionMap[action];
  if (!prefix || !suffix) return false;

  const key = `${prefix}_${suffix}`;
  return granted.has(key) && !revoked.has(key);
}

export function hasExplicitAccessProfile(user: AccessProfile | null | undefined) {
  return Boolean(
    (user?.permissionKeys?.length ?? 0) > 0 ||
    (user?.revokedPermissionKeys?.length ?? 0) > 0 ||
    Object.keys(user?.permissions ?? {}).length > 0
  );
}

function moduleRoleAllowsAction(moduleKey: string, action: string, role: EnterpriseRole | null) {
  if (!role) return false;
  const config = modulesConfig[moduleKey];
  if (!config?.permissions) return false;
  const permissionField = action === 'read' ? 'view' : action === 'update' ? 'edit' : action;
  const allowedRoles = config.permissions[permissionField as keyof typeof config.permissions];
  return Array.isArray(allowedRoles) && allowedRoles.includes(role);
}

export function userHasModuleAction(user: AccessProfile | null | undefined, moduleKey: string, action: string) {
  if (!user) return false;

  const normalizedRole = normalizeRole(user.role);
  if (normalizedRole === 'super_admin' && !hasExplicitAccessProfile(user)) return true;

  const moduleAliases = legacyModuleAliases[moduleKey] ?? [moduleKey];
  const legacyActions = moduleAliases.flatMap((key) => user.permissions?.[key] ?? []);
  const legacyActionAliases = action === 'read' ? ['read', 'view'] : [action];
  const legacyAllows = legacyActionAliases.some((legacyAction) => legacyActions.includes(legacyAction));
  const enterpriseAllows = hasEnterprisePermission(user, moduleKey, action);
  const roleAllows = moduleRoleAllowsAction(moduleKey, action, normalizedRole);

  // When the session carries enterprise permissionKeys, those are the source of truth
  // so sidebar links match backend route policies (e.g. parent without MESSAGE_VIEW).
  if ((user.permissionKeys?.length ?? 0) > 0) {
    return enterpriseAllows || legacyAllows || normalizedRole === 'super_admin';
  }

  return legacyAllows || enterpriseAllows || roleAllows;
}

export function userCanUsePathAction(user: AccessProfile | null | undefined, pathname: string, action: string) {
  if (!user) return false;
  const moduleKey = getModuleFromPath(pathname);
  return userHasModuleAction(user, moduleKey, action);
}

export function isPathDeniedForRole(role: Role | string | null | undefined, pathname: string) {
  const normalizedRole = normalizeRole(role as Role);
  return Boolean(normalizedRole && roleDeniedPaths[normalizedRole]?.has(pathname));
}

export function userCanOpenPath(user: AccessProfile | null | undefined, pathname: string) {
  if (!user) return false;

  // Core shell routes must always stay available for every signed-in role.
  if (pathname === '/dashboard' || pathname === '/profile') return true;

  const normalizedRole = normalizeRole(user.role as Role);
  if (normalizedRole === 'student' && pathname === '/exams') return true;

  const moduleKey = getModuleFromPath(pathname);
  const config =
    modulesConfig[moduleKey] ??
    Object.values(modulesConfig).find((item) => item.path === pathname);

  const enterpriseRead =
    hasEnterprisePermission(user, moduleKey, 'read') ||
    hasEnterprisePermission(user, moduleKey, 'create') ||
    hasEnterprisePermission(user, moduleKey, 'update') ||
    hasEnterprisePermission(user, moduleKey, 'delete');

  // Role deny-list can be overridden by an explicit enterprise grant (custom family sections).
  if (isPathDeniedForRole(user.role, pathname) && !enterpriseRead) {
    return false;
  }

  // Keep sidebar links aligned with module view roles, unless custom grant exists.
  if (config?.permissions?.view?.length && normalizedRole) {
    if (!config.permissions.view.includes(normalizedRole) && !enterpriseRead) {
      return false;
    }
  }

  return (
    userHasModuleAction(user, moduleKey, 'read') ||
    userHasModuleAction(user, moduleKey, 'create') ||
    userHasModuleAction(user, moduleKey, 'update') ||
    userHasModuleAction(user, moduleKey, 'delete')
  );
}

/** Single ordered nav used by every role; visibility is filtered by userCanOpenPath. */
const masterMenu: MenuItem[] = [
  { path: '/dashboard', label: 'common.dashboard', icon: Home, roles: coreRoles },
  { path: '/academic-standards', label: 'common.academic_standards', icon: Award, roles: ['super_admin', 'admin', 'branch_manager', 'owner'] },
  { path: '/enterprise', label: 'common.enterprise_erp', icon: ShieldCheck, roles: ['super_admin', 'admin', 'branch_manager', 'owner'] },
  { path: '/branches', label: 'common.branches', icon: Building2, roles: coreRoles },
  { path: '/users', label: 'common.users', icon: Users, roles: coreRoles },
  { path: '/students', label: 'common.students', icon: GraduationCap, roles: coreRoles },
  { path: '/teachers', label: 'common.teachers', icon: UserCheck, roles: coreRoles },
  { path: '/families', label: 'common.families', icon: Users, roles: coreRoles },
  { path: '/classes', label: 'common.classes', icon: Layers, roles: coreRoles },
  { path: '/timetable', label: 'common.timetable', icon: CalendarDays, roles: coreRoles },
  { path: '/courses', label: 'common.courses', icon: BookOpen, roles: coreRoles },
  { path: '/subjects', label: 'common.subjects', icon: BookOpen, roles: coreRoles },
  { path: '/attendance', label: 'common.attendance', icon: ClipboardList, roles: coreRoles },
  { path: '/exams', label: 'common.exams', icon: CalendarCheck, roles: coreRoles },
  { path: '/results', label: 'common.results', icon: FileText, roles: coreRoles },
  { path: '/payments', label: 'common.payments', icon: AfghaniIcon, roles: coreRoles },
  { path: '/finance', label: 'common.finance', icon: AfghaniIcon, roles: ['super_admin', 'admin', 'owner', 'branch_manager'] },
  { path: '/loans', label: 'common.loans', icon: Wallet, roles: ['super_admin', 'admin', 'owner', 'branch_manager'] },
  { path: '/expenses', label: 'common.expenses', icon: AfghaniIcon, roles: ['super_admin', 'admin', 'owner', 'branch_manager'] },
  { path: '/payroll', label: 'common.payroll_tax', icon: AfghaniIcon, roles: ['super_admin', 'admin', 'owner', 'branch_manager', 'teacher'] },
  { path: '/academy-financial-report', label: 'common.academy_financial_report', icon: AfghaniIcon, roles: ['super_admin', 'admin', 'owner', 'branch_manager'] },
  { path: '/reports', label: 'common.reports', icon: Activity, roles: coreRoles },
  { path: '/books', label: 'common.books', icon: BookOpen, roles: coreRoles },
  { path: '/messages', label: 'messages.title', icon: MessageSquare, roles: coreRoles },
  { path: '/notifications', label: 'common.notifications', icon: Bell, roles: coreRoles },
  { path: '/curriculum', label: 'common.curriculum', icon: BookOpen, roles: coreRoles },
  { path: '/ai-assistant', label: 'common.ai_assistant', icon: BrainCircuit, roles: ['super_admin', 'admin', 'teacher', 'owner', 'branch_manager', 'system_automation'] },
  { path: '/audit', label: 'common.audit_logs', icon: ShieldCheck, roles: coreRoles },
  { path: '/roles', label: 'common.roles', icon: ShieldCheck, roles: coreRoles }
];

const menuConfig: Record<EnterpriseRole, MenuItem[]> = {
  super_admin: masterMenu,
  admin: masterMenu,
  teacher: masterMenu,
  student: masterMenu,
  parent: masterMenu,
  owner: masterMenu,
  branch_manager: masterMenu,
  system_automation: masterMenu
};

export function getMenuForRole(role: Role | null) {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return [];
  return masterMenu.filter((item) => !disabledSystemPaths.has(item.path));
}

export function getMenuForUser(user: AccessProfile | null | undefined) {
  if (!user) return [];

  // Same link order/style for every account; only permitted sections are shown.
  return masterMenu.filter(
    (item) => !disabledSystemPaths.has(item.path) && userCanOpenPath(user, item.path)
  );
}

export function getRouteLabel(role: Role | null, pathname: string) {
  const exact = masterMenu.find((route) => route.path === pathname);
  if (exact) return exact.label;
  if (pathname.startsWith('/dashboard')) return 'common.dashboard';
  return 'common.dashboard';
}

export const allModuleConfigs = Object.values(modulesConfig);
