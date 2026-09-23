/// Shared API URL rules — aligned with [frontend/src/services/apiClient.ts].
abstract final class ApiUrlResolver {
  /// Vite dev server (web UI + `/api` proxy to backend).
  static const int devWebPort = 5173;

  /// Express API process (always running in dev stack).
  static const int devBackendPort = 8081;

  static const Set<int> viteDevPorts = {
    5173,
    5174,
    5175,
    5176,
    5177,
    5178,
    4173,
    4174,
    4175,
    4176,
    4177,
    4178,
  };

  static bool isViteDevPort(int port) => viteDevPorts.contains(port);

  static bool isLocalHost(String host) =>
      host == 'localhost' || host == '127.0.0.1';

  /// Default mobile/native dev API — Vite proxy on the host machine.
  static String defaultDevelopmentApiUrl({String host = '127.0.0.1'}) =>
      'http://$host:$devWebPort/api';

  /// Direct backend API (bypass Vite); used for tests and explicit overrides.
  static String directBackendApiUrl({String host = '127.0.0.1'}) =>
      'http://$host:$devBackendPort/api';
}
