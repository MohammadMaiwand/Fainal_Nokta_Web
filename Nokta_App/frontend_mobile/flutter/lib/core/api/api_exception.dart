class ApiException implements Exception {
  ApiException({
    required this.message,
    this.statusCode,
    this.isNetworkError = false,
    this.isPermissionDenied = false,
    this.isUnauthorized = false,
    this.isTimeout = false,
  });

  final String message;
  final int? statusCode;
  final bool isNetworkError;
  final bool isPermissionDenied;
  final bool isUnauthorized;
  final bool isTimeout;

  @override
  String toString() => 'ApiException($statusCode): $message';
}
