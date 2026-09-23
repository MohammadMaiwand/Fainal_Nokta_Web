import 'package:flutter/foundation.dart';

import 'api_url_resolver.dart';

/// Web / desktop — same-origin `/api` on Vite ports (like the React web app).
String resolveMobileApiBaseUrl(String fromDefine, String Function(String) normalize) {
  if (fromDefine.trim().isNotEmpty) {
    return normalize(fromDefine.trim());
  }

  if (kIsWeb) {
    final uri = Uri.base;
    final host = uri.host;
    if (ApiUrlResolver.isLocalHost(host) &&
        (ApiUrlResolver.isViteDevPort(uri.port) ||
            uri.port == ApiUrlResolver.devBackendPort)) {
      return normalize('${uri.origin}/api');
    }
    return normalize(ApiUrlResolver.defaultDevelopmentApiUrl());
  }

  return normalize(ApiUrlResolver.defaultDevelopmentApiUrl());
}
