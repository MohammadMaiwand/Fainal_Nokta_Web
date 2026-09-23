import '../api/api_exception.dart';
import '../widgets/app_error_views.dart';

/// Maps API failures to user-facing error screens.
AppErrorType appErrorTypeFor(ApiException error) {
  if (error.isPermissionDenied) return AppErrorType.permission;
  if (error.isUnauthorized) return AppErrorType.sessionExpired;
  if (error.isTimeout || error.isNetworkError) return AppErrorType.network;
  return AppErrorType.backend;
}
