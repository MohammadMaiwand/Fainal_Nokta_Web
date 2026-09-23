import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_fa.dart';
import 'app_localizations_ps.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('fa'),
    Locale('ps'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Nokta Academy'**
  String get appTitle;

  /// No description provided for @navHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get navHome;

  /// No description provided for @navAbout.
  ///
  /// In en, this message translates to:
  /// **'About'**
  String get navAbout;

  /// No description provided for @navContact.
  ///
  /// In en, this message translates to:
  /// **'Contact'**
  String get navContact;

  /// No description provided for @navLogin.
  ///
  /// In en, this message translates to:
  /// **'Login'**
  String get navLogin;

  /// No description provided for @navDashboard.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get navDashboard;

  /// No description provided for @navProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get navProfile;

  /// No description provided for @navSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get navSettings;

  /// No description provided for @navMessages.
  ///
  /// In en, this message translates to:
  /// **'Messages'**
  String get navMessages;

  /// No description provided for @navNotifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get navNotifications;

  /// No description provided for @navTimetable.
  ///
  /// In en, this message translates to:
  /// **'Timetable'**
  String get navTimetable;

  /// No description provided for @navAttendance.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get navAttendance;

  /// No description provided for @navPayments.
  ///
  /// In en, this message translates to:
  /// **'Payments'**
  String get navPayments;

  /// No description provided for @navResults.
  ///
  /// In en, this message translates to:
  /// **'Results'**
  String get navResults;

  /// No description provided for @navClasses.
  ///
  /// In en, this message translates to:
  /// **'Classes'**
  String get navClasses;

  /// No description provided for @navSubjects.
  ///
  /// In en, this message translates to:
  /// **'Subjects'**
  String get navSubjects;

  /// No description provided for @navStudents.
  ///
  /// In en, this message translates to:
  /// **'Students'**
  String get navStudents;

  /// No description provided for @navTeachers.
  ///
  /// In en, this message translates to:
  /// **'Teachers'**
  String get navTeachers;

  /// No description provided for @navFinance.
  ///
  /// In en, this message translates to:
  /// **'Finance'**
  String get navFinance;

  /// No description provided for @navReports.
  ///
  /// In en, this message translates to:
  /// **'Reports'**
  String get navReports;

  /// No description provided for @navLibrary.
  ///
  /// In en, this message translates to:
  /// **'Library'**
  String get navLibrary;

  /// No description provided for @commonCourses.
  ///
  /// In en, this message translates to:
  /// **'Courses'**
  String get commonCourses;

  /// No description provided for @commonClasses.
  ///
  /// In en, this message translates to:
  /// **'Classes'**
  String get commonClasses;

  /// No description provided for @commonAnnouncements.
  ///
  /// In en, this message translates to:
  /// **'Announcements'**
  String get commonAnnouncements;

  /// No description provided for @loginTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get loginTitle;

  /// No description provided for @email.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get email;

  /// No description provided for @password.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get password;

  /// No description provided for @rememberMe.
  ///
  /// In en, this message translates to:
  /// **'Remember me'**
  String get rememberMe;

  /// No description provided for @loginButton.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get loginButton;

  /// No description provided for @selectRole.
  ///
  /// In en, this message translates to:
  /// **'Role'**
  String get selectRole;

  /// No description provided for @chooseRole.
  ///
  /// In en, this message translates to:
  /// **'Choose a role'**
  String get chooseRole;

  /// No description provided for @loginRoleHelp.
  ///
  /// In en, this message translates to:
  /// **'Optional: pick a demo role to fill test credentials (development only).'**
  String get loginRoleHelp;

  /// No description provided for @loginApiUrlLabel.
  ///
  /// In en, this message translates to:
  /// **'API server URL'**
  String get loginApiUrlLabel;

  /// No description provided for @loginBackendUnreachable.
  ///
  /// In en, this message translates to:
  /// **'Server is not reachable. From the project root run: npm run dev'**
  String get loginBackendUnreachable;

  /// No description provided for @loginTwoFactorRequired.
  ///
  /// In en, this message translates to:
  /// **'Two-factor code required. Enter the code sent to your phone.'**
  String get loginTwoFactorRequired;

  /// No description provided for @logout.
  ///
  /// In en, this message translates to:
  /// **'Log out'**
  String get logout;

  /// No description provided for @logoutConfirm.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to sign out?'**
  String get logoutConfirm;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'Loading…'**
  String get loading;

  /// No description provided for @errorGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get errorGeneric;

  /// No description provided for @errorPermission.
  ///
  /// In en, this message translates to:
  /// **'You do not have permission to perform this action.'**
  String get errorPermission;

  /// No description provided for @errorNetwork.
  ///
  /// In en, this message translates to:
  /// **'Network connection problem'**
  String get errorNetwork;

  /// No description provided for @errorBackend.
  ///
  /// In en, this message translates to:
  /// **'Server is unavailable right now'**
  String get errorBackend;

  /// No description provided for @errorSessionExpired.
  ///
  /// In en, this message translates to:
  /// **'Your session has expired. Please sign in again.'**
  String get errorSessionExpired;

  /// No description provided for @errorValidation.
  ///
  /// In en, this message translates to:
  /// **'Please check your input'**
  String get errorValidation;

  /// No description provided for @errorOfflineBlocked.
  ///
  /// In en, this message translates to:
  /// **'This action is not available while offline'**
  String get errorOfflineBlocked;

  /// No description provided for @offlineBanner.
  ///
  /// In en, this message translates to:
  /// **'You are offline. Some actions are unavailable.'**
  String get offlineBanner;

  /// No description provided for @offlineCachedBanner.
  ///
  /// In en, this message translates to:
  /// **'Offline: showing last saved data'**
  String get offlineCachedBanner;

  /// No description provided for @emptyState.
  ///
  /// In en, this message translates to:
  /// **'Nothing to show yet.'**
  String get emptyState;

  /// No description provided for @pullToRefresh.
  ///
  /// In en, this message translates to:
  /// **'Pull to refresh'**
  String get pullToRefresh;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @theme.
  ///
  /// In en, this message translates to:
  /// **'Theme'**
  String get theme;

  /// No description provided for @themeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeDark;

  /// No description provided for @themeSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get themeSystem;

  /// No description provided for @sendMessage.
  ///
  /// In en, this message translates to:
  /// **'Send message'**
  String get sendMessage;

  /// No description provided for @contactName.
  ///
  /// In en, this message translates to:
  /// **'Your name'**
  String get contactName;

  /// No description provided for @contactEmail.
  ///
  /// In en, this message translates to:
  /// **'Email (optional)'**
  String get contactEmail;

  /// No description provided for @contactMessage.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get contactMessage;

  /// No description provided for @viewClasses.
  ///
  /// In en, this message translates to:
  /// **'View classes'**
  String get viewClasses;

  /// No description provided for @todayTimetable.
  ///
  /// In en, this message translates to:
  /// **'Today\'s schedule'**
  String get todayTimetable;

  /// No description provided for @unreadMessages.
  ///
  /// In en, this message translates to:
  /// **'Unread messages'**
  String get unreadMessages;

  /// No description provided for @quickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick actions'**
  String get quickActions;

  /// No description provided for @welcomeBack.
  ///
  /// In en, this message translates to:
  /// **'Welcome back'**
  String get welcomeBack;

  /// No description provided for @publicHeroTitle.
  ///
  /// In en, this message translates to:
  /// **'Nokta Academy'**
  String get publicHeroTitle;

  /// No description provided for @publicHeroSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Quality education for every learner'**
  String get publicHeroSubtitle;

  /// No description provided for @academyServices.
  ///
  /// In en, this message translates to:
  /// **'Academy services'**
  String get academyServices;

  /// No description provided for @registrationOpen.
  ///
  /// In en, this message translates to:
  /// **'Registration open'**
  String get registrationOpen;

  /// No description provided for @publicServicesBody.
  ///
  /// In en, this message translates to:
  /// **'Classes, courses, attendance, payments, and messaging — all in one academy platform.'**
  String get publicServicesBody;

  /// No description provided for @publicDemoDataBanner.
  ///
  /// In en, this message translates to:
  /// **'Showing sample data. Run npm run dev from the project root for live content.'**
  String get publicDemoDataBanner;

  /// No description provided for @contactSuccess.
  ///
  /// In en, this message translates to:
  /// **'Message sent successfully'**
  String get contactSuccess;

  /// No description provided for @timetableToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get timetableToday;

  /// No description provided for @timetableWeek.
  ///
  /// In en, this message translates to:
  /// **'Week'**
  String get timetableWeek;

  /// No description provided for @timetableNow.
  ///
  /// In en, this message translates to:
  /// **'Now'**
  String get timetableNow;

  /// No description provided for @timetableEmptyToday.
  ///
  /// In en, this message translates to:
  /// **'No classes scheduled for today'**
  String get timetableEmptyToday;

  /// No description provided for @attendancePresent.
  ///
  /// In en, this message translates to:
  /// **'Present'**
  String get attendancePresent;

  /// No description provided for @attendanceAbsent.
  ///
  /// In en, this message translates to:
  /// **'Absent'**
  String get attendanceAbsent;

  /// No description provided for @attendanceLate.
  ///
  /// In en, this message translates to:
  /// **'Late'**
  String get attendanceLate;

  /// No description provided for @attendanceActiveSessions.
  ///
  /// In en, this message translates to:
  /// **'Sessions'**
  String get attendanceActiveSessions;

  /// No description provided for @attendanceRecent.
  ///
  /// In en, this message translates to:
  /// **'Recent records'**
  String get attendanceRecent;

  /// No description provided for @attendanceMarkPresent.
  ///
  /// In en, this message translates to:
  /// **'Mark present'**
  String get attendanceMarkPresent;

  /// No description provided for @attendanceMarked.
  ///
  /// In en, this message translates to:
  /// **'Attendance recorded'**
  String get attendanceMarked;

  /// No description provided for @attendanceSessionClosed.
  ///
  /// In en, this message translates to:
  /// **'Session is not open for marking'**
  String get attendanceSessionClosed;

  /// No description provided for @paymentsTotalPaid.
  ///
  /// In en, this message translates to:
  /// **'Total paid'**
  String get paymentsTotalPaid;

  /// No description provided for @paymentsPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get paymentsPending;

  /// No description provided for @paymentsRecent.
  ///
  /// In en, this message translates to:
  /// **'Recent payments'**
  String get paymentsRecent;

  /// No description provided for @paymentsReadOnly.
  ///
  /// In en, this message translates to:
  /// **'History only'**
  String get paymentsReadOnly;

  /// No description provided for @messagesInbox.
  ///
  /// In en, this message translates to:
  /// **'Inbox'**
  String get messagesInbox;

  /// No description provided for @messagesSent.
  ///
  /// In en, this message translates to:
  /// **'Sent'**
  String get messagesSent;

  /// No description provided for @messagesReply.
  ///
  /// In en, this message translates to:
  /// **'Reply'**
  String get messagesReply;

  /// No description provided for @messagesDetail.
  ///
  /// In en, this message translates to:
  /// **'Message'**
  String get messagesDetail;

  /// No description provided for @currencyAfn.
  ///
  /// In en, this message translates to:
  /// **'AFN {amount}'**
  String currencyAfn(String amount);

  /// No description provided for @twoFactorTitle.
  ///
  /// In en, this message translates to:
  /// **'Two-factor verification'**
  String get twoFactorTitle;

  /// No description provided for @twoFactorSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Enter the code sent to your email'**
  String get twoFactorSubtitle;

  /// No description provided for @twoFactorCode.
  ///
  /// In en, this message translates to:
  /// **'Verification code'**
  String get twoFactorCode;

  /// No description provided for @twoFactorVerify.
  ///
  /// In en, this message translates to:
  /// **'Verify and sign in'**
  String get twoFactorVerify;

  /// No description provided for @twoFactorBack.
  ///
  /// In en, this message translates to:
  /// **'Back to sign in'**
  String get twoFactorBack;

  /// No description provided for @navFamily.
  ///
  /// In en, this message translates to:
  /// **'My children'**
  String get navFamily;

  /// No description provided for @navExpenses.
  ///
  /// In en, this message translates to:
  /// **'Expenses'**
  String get navExpenses;

  /// No description provided for @navSalaries.
  ///
  /// In en, this message translates to:
  /// **'Salaries'**
  String get navSalaries;

  /// No description provided for @navAudit.
  ///
  /// In en, this message translates to:
  /// **'Audit log'**
  String get navAudit;

  /// No description provided for @familyEmpty.
  ///
  /// In en, this message translates to:
  /// **'No linked students found for your family account.'**
  String get familyEmpty;

  /// No description provided for @familyStudentDashboard.
  ///
  /// In en, this message translates to:
  /// **'Student overview'**
  String get familyStudentDashboard;

  /// No description provided for @familyStudentHint.
  ///
  /// In en, this message translates to:
  /// **'Open attendance, payments, timetable, and results for this student.'**
  String get familyStudentHint;

  /// No description provided for @readOnlyLabel.
  ///
  /// In en, this message translates to:
  /// **'Read only'**
  String get readOnlyLabel;

  /// No description provided for @drawerSearch.
  ///
  /// In en, this message translates to:
  /// **'Search menu'**
  String get drawerSearch;

  /// No description provided for @devReadinessTitle.
  ///
  /// In en, this message translates to:
  /// **'App readiness'**
  String get devReadinessTitle;

  /// No description provided for @devApiBase.
  ///
  /// In en, this message translates to:
  /// **'API base URL'**
  String get devApiBase;

  /// No description provided for @devEnvironment.
  ///
  /// In en, this message translates to:
  /// **'Environment'**
  String get devEnvironment;

  /// No description provided for @devBackendReachable.
  ///
  /// In en, this message translates to:
  /// **'Backend reachable'**
  String get devBackendReachable;

  /// No description provided for @devAuthStatus.
  ///
  /// In en, this message translates to:
  /// **'Auth status'**
  String get devAuthStatus;

  /// No description provided for @devCurrentRole.
  ///
  /// In en, this message translates to:
  /// **'Current role'**
  String get devCurrentRole;

  /// No description provided for @devPermissionCount.
  ///
  /// In en, this message translates to:
  /// **'Permission count'**
  String get devPermissionCount;

  /// No description provided for @devCacheStatus.
  ///
  /// In en, this message translates to:
  /// **'Cache status'**
  String get devCacheStatus;

  /// No description provided for @devLocale.
  ///
  /// In en, this message translates to:
  /// **'Locale'**
  String get devLocale;

  /// No description provided for @devTextDirection.
  ///
  /// In en, this message translates to:
  /// **'Text direction'**
  String get devTextDirection;

  /// No description provided for @aboutTitle.
  ///
  /// In en, this message translates to:
  /// **'About'**
  String get aboutTitle;

  /// No description provided for @aboutVersion.
  ///
  /// In en, this message translates to:
  /// **'Version'**
  String get aboutVersion;

  /// No description provided for @aboutApiHost.
  ///
  /// In en, this message translates to:
  /// **'API host'**
  String get aboutApiHost;

  /// No description provided for @aboutSupport.
  ///
  /// In en, this message translates to:
  /// **'Support'**
  String get aboutSupport;

  /// No description provided for @aboutSupportHint.
  ///
  /// In en, this message translates to:
  /// **'For help, contact your academy through the public website contact form or your school administrator.'**
  String get aboutSupportHint;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'fa', 'ps'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'fa':
      return AppLocalizationsFa();
    case 'ps':
      return AppLocalizationsPs();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
