import 'dart:io' show Platform;

import 'api_url_resolver.dart';

/// Android emulator: 10.0.2.2 = host machine localhost.
String resolveMobileApiBaseUrl(String fromDefine, String Function(String) normalize) {
  var url = fromDefine.trim();
  if (url.isEmpty) {
    url = ApiUrlResolver.defaultDevelopmentApiUrl();
  }

  if (Platform.isAndroid) {
    url = _rewriteAndroidLoopback(url);
  }

  return normalize(url);
}

/// `127.0.0.1` / `localhost` in dart-define or defaults point at the emulator itself.
String _rewriteAndroidLoopback(String url) {
  return url
      .replaceFirst('://127.0.0.1:', '://10.0.2.2:')
      .replaceFirst('://localhost:', '://10.0.2.2:');
}
