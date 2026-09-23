// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Nokta Academy';

  @override
  String get navHome => 'Home';

  @override
  String get navAbout => 'About';

  @override
  String get navContact => 'Contact';

  @override
  String get navLogin => 'Login';

  @override
  String get navDashboard => 'Dashboard';

  @override
  String get navProfile => 'Profile';

  @override
  String get navSettings => 'Settings';

  @override
  String get navMessages => 'Messages';

  @override
  String get navNotifications => 'Notifications';

  @override
  String get navTimetable => 'Timetable';

  @override
  String get navAttendance => 'Attendance';

  @override
  String get navPayments => 'Payments';

  @override
  String get navResults => 'Results';

  @override
  String get navClasses => 'Classes';

  @override
  String get navSubjects => 'Subjects';

  @override
  String get navStudents => 'Students';

  @override
  String get navTeachers => 'Teachers';

  @override
  String get navFinance => 'Finance';

  @override
  String get navReports => 'Reports';

  @override
  String get navLibrary => 'Library';

  @override
  String get commonCourses => 'Courses';

  @override
  String get commonClasses => 'Classes';

  @override
  String get commonAnnouncements => 'Announcements';

  @override
  String get loginTitle => 'Sign in';

  @override
  String get email => 'Email';

  @override
  String get password => 'Password';

  @override
  String get rememberMe => 'Remember me';

  @override
  String get loginButton => 'Sign in';

  @override
  String get selectRole => 'Role';

  @override
  String get chooseRole => 'Choose a role';

  @override
  String get loginRoleHelp =>
      'Optional: pick a demo role to fill test credentials (development only).';

  @override
  String get loginApiUrlLabel => 'API server URL';

  @override
  String get loginBackendUnreachable =>
      'Server is not reachable. From the project root run: npm run dev';

  @override
  String get loginTwoFactorRequired =>
      'Two-factor code required. Enter the code sent to your phone.';

  @override
  String get logout => 'Log out';

  @override
  String get logoutConfirm => 'Are you sure you want to sign out?';

  @override
  String get cancel => 'Cancel';

  @override
  String get loading => 'Loading…';

  @override
  String get errorGeneric => 'Something went wrong. Please try again.';

  @override
  String get errorPermission =>
      'You do not have permission to perform this action.';

  @override
  String get errorNetwork => 'Network connection problem';

  @override
  String get errorBackend => 'Server is unavailable right now';

  @override
  String get errorSessionExpired =>
      'Your session has expired. Please sign in again.';

  @override
  String get errorValidation => 'Please check your input';

  @override
  String get errorOfflineBlocked =>
      'This action is not available while offline';

  @override
  String get offlineBanner => 'You are offline. Some actions are unavailable.';

  @override
  String get offlineCachedBanner => 'Offline: showing last saved data';

  @override
  String get emptyState => 'Nothing to show yet.';

  @override
  String get pullToRefresh => 'Pull to refresh';

  @override
  String get language => 'Language';

  @override
  String get theme => 'Theme';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String get themeSystem => 'System';

  @override
  String get sendMessage => 'Send message';

  @override
  String get contactName => 'Your name';

  @override
  String get contactEmail => 'Email (optional)';

  @override
  String get contactMessage => 'Message';

  @override
  String get viewClasses => 'View classes';

  @override
  String get todayTimetable => 'Today\'s schedule';

  @override
  String get unreadMessages => 'Unread messages';

  @override
  String get quickActions => 'Quick actions';

  @override
  String get welcomeBack => 'Welcome back';

  @override
  String get publicHeroTitle => 'Nokta Academy';

  @override
  String get publicHeroSubtitle => 'Quality education for every learner';

  @override
  String get academyServices => 'Academy services';

  @override
  String get registrationOpen => 'Registration open';

  @override
  String get publicServicesBody =>
      'Classes, courses, attendance, payments, and messaging — all in one academy platform.';

  @override
  String get publicDemoDataBanner =>
      'Showing sample data. Run npm run dev from the project root for live content.';

  @override
  String get contactSuccess => 'Message sent successfully';

  @override
  String get timetableToday => 'Today';

  @override
  String get timetableWeek => 'Week';

  @override
  String get timetableNow => 'Now';

  @override
  String get timetableEmptyToday => 'No classes scheduled for today';

  @override
  String get attendancePresent => 'Present';

  @override
  String get attendanceAbsent => 'Absent';

  @override
  String get attendanceLate => 'Late';

  @override
  String get attendanceActiveSessions => 'Sessions';

  @override
  String get attendanceRecent => 'Recent records';

  @override
  String get attendanceMarkPresent => 'Mark present';

  @override
  String get attendanceMarked => 'Attendance recorded';

  @override
  String get attendanceSessionClosed => 'Session is not open for marking';

  @override
  String get paymentsTotalPaid => 'Total paid';

  @override
  String get paymentsPending => 'Pending';

  @override
  String get paymentsRecent => 'Recent payments';

  @override
  String get paymentsReadOnly => 'History only';

  @override
  String get messagesInbox => 'Inbox';

  @override
  String get messagesSent => 'Sent';

  @override
  String get messagesReply => 'Reply';

  @override
  String get messagesDetail => 'Message';

  @override
  String currencyAfn(String amount) {
    return 'AFN $amount';
  }

  @override
  String get twoFactorTitle => 'Two-factor verification';

  @override
  String get twoFactorSubtitle => 'Enter the code sent to your email';

  @override
  String get twoFactorCode => 'Verification code';

  @override
  String get twoFactorVerify => 'Verify and sign in';

  @override
  String get twoFactorBack => 'Back to sign in';

  @override
  String get navFamily => 'My children';

  @override
  String get navExpenses => 'Expenses';

  @override
  String get navSalaries => 'Salaries';

  @override
  String get navAudit => 'Audit log';

  @override
  String get familyEmpty => 'No linked students found for your family account.';

  @override
  String get familyStudentDashboard => 'Student overview';

  @override
  String get familyStudentHint =>
      'Open attendance, payments, timetable, and results for this student.';

  @override
  String get readOnlyLabel => 'Read only';

  @override
  String get drawerSearch => 'Search menu';

  @override
  String get devReadinessTitle => 'App readiness';

  @override
  String get devApiBase => 'API base URL';

  @override
  String get devEnvironment => 'Environment';

  @override
  String get devBackendReachable => 'Backend reachable';

  @override
  String get devAuthStatus => 'Auth status';

  @override
  String get devCurrentRole => 'Current role';

  @override
  String get devPermissionCount => 'Permission count';

  @override
  String get devCacheStatus => 'Cache status';

  @override
  String get devLocale => 'Locale';

  @override
  String get devTextDirection => 'Text direction';

  @override
  String get aboutTitle => 'About';

  @override
  String get aboutVersion => 'Version';

  @override
  String get aboutApiHost => 'API host';

  @override
  String get aboutSupport => 'Support';

  @override
  String get aboutSupportHint =>
      'For help, contact your academy through the public website contact form or your school administrator.';
}
