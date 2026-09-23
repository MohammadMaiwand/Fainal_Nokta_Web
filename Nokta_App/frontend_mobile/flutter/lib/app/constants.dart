/// API paths relative to base URL (which already includes `/api`).
abstract final class ApiPaths {
  static const authLogin = '/auth/login';
  static const authLogin2fa = '/auth/login/2fa';
  static const authRefresh = '/auth/refresh';
  static const authLogout = '/auth/logout';
  static const authProfile = '/auth/profile';
  static const authRegisterOptions = '/auth/register/options';
  static const authRegisterQuote = '/auth/register/quote';
  static const authRegisterCheckout = '/auth/register/checkout';
  static const authRegisterConfirmPayment = '/auth/register/confirm-payment';
  static const authRegisterStudent = '/auth/register/student';

  static const classesPublicHome = '/classes/public/home';
  static const classesPublic = '/classes/public';
  static const coursesPublicHome = '/courses/public/home';
  static const notificationsPublic = '/notifications/public';
  static const messagesPublicContact = '/messages/public-contact';

  static const dashboardSummary = '/dashboard/summary';
  static const studentsMeDashboard = '/students/me/dashboard';
  static const studentsMeProfile = '/students/me/profile';
  static const studentsMeClasses = '/students/me/classes';
  static const studentsMeSubjects = '/students/me/subjects';
  static const studentsMeTeachers = '/students/me/teachers';
  static const studentsMeTimetable = '/students/me/timetable';
  static const studentsMePayments = '/students/me/payments';
  static const studentsFamily = '/students/family';
  static const studentsTeacher = '/students/teacher';
  static const messagesInbox = '/messages/inbox';
  static const messagesSent = '/messages/sent';
  static const messagesUnreadCount = '/messages/unread-count';
  static const timetableWeek = '/timetable/week';
  static const attendance = '/attendance';
  static const attendanceSummary = '/attendance/summary';
  static const attendanceActiveSessions = '/attendance/active-sessions';
  static const attendanceMark = '/attendance/mark';
  static const payments = '/payments';
  static const financeSummary = '/finance/summary';
  static const financeMeEarnings = '/finance/me/earnings';
  static const expenses = '/expenses';
  static const salaries = '/salaries';
  static const audit = '/audit';
  static const notifications = '/notifications';
  static const results = '/results';
  static const classes = '/classes';
  static const subjects = '/subjects';
  static const books = '/books';
  static const students = '/students';
  static const teachers = '/teachers';
  static const finance = '/finance';
  static const reports = '/reports';
}

abstract final class AppRoles {
  static const superAdmin = 'super_admin';
  static const admin = 'admin';
  static const branchManager = 'branch_manager';
  static const teacher = 'teacher';
  static const student = 'student';
  static const parent = 'parent';
  static const familyStudent = 'family_student';
  static const owner = 'owner';
  static const accountant = 'accountant';
  static const librarian = 'librarian';
}

abstract final class StorageKeys {
  static const accessToken = 'access_token';
  static const refreshToken = 'refresh_token';
  static const rememberMe = 'remember_me';
  static const userJson = 'user_json';
  static const locale = 'locale';
  static const themeMode = 'theme_mode';
}
