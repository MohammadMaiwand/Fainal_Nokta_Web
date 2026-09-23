import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/auth/permission_service.dart';
import '../../../core/cache/offline_cache_service.dart';
import '../data/auth_repository.dart';
import '../models/login_result.dart';
import '../models/user_profile.dart';

enum AuthStatus { unknown, unauthenticated, authenticated }

class AuthState {
  const AuthState({
    this.status = AuthStatus.unknown,
    this.user,
    this.errorMessage,
    this.isLoading = false,
    this.pendingTwoFactorEmail,
  });

  final AuthStatus status;
  final UserProfile? user;
  final String? errorMessage;
  final bool isLoading;
  final String? pendingTwoFactorEmail;

  AuthState copyWith({
    AuthStatus? status,
    UserProfile? user,
    String? errorMessage,
    bool? isLoading,
    bool clearError = false,
    String? pendingTwoFactorEmail,
    bool clearTwoFactor = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      isLoading: isLoading ?? this.isLoading,
      pendingTwoFactorEmail: clearTwoFactor
          ? null
          : (pendingTwoFactorEmail ?? this.pendingTwoFactorEmail),
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._repository, this._permissions)
      : super(const AuthState());

  final AuthRepository _repository;
  final PermissionService _permissions;
  int _sessionEpoch = 0;

  PermissionService get permissions => _permissions;

  void _bumpSessionEpoch() => _sessionEpoch++;

  Future<void> bootstrap() async {
    final epoch = _sessionEpoch;
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final hasSession = await _repository.hasStoredSession();
      if (!hasSession) {
        if (epoch != _sessionEpoch) return;
        state = const AuthState(status: AuthStatus.unauthenticated, isLoading: false);
        return;
      }
      final cached = await _repository.readCachedUser();
      if (cached != null && epoch == _sessionEpoch) {
        state = AuthState(
          status: AuthStatus.authenticated,
          user: cached,
          isLoading: false,
        );
      }
      final profile = await _repository.fetchProfile();
      if (epoch != _sessionEpoch) return;
      state = AuthState(
        status: AuthStatus.authenticated,
        user: profile,
        isLoading: false,
      );
    } on ApiException catch (e) {
      if (epoch != _sessionEpoch) return;
      if (e.isUnauthorized) {
        await _repository.logout();
        state = const AuthState(
          status: AuthStatus.unauthenticated,
          isLoading: false,
          errorMessage: '__session_expired__',
        );
      } else {
        final cached = await _repository.readCachedUser();
        state = AuthState(
          status: cached != null ? AuthStatus.authenticated : AuthStatus.unauthenticated,
          user: cached,
          isLoading: false,
          errorMessage: e.message,
        );
      }
    } catch (_) {
      if (epoch != _sessionEpoch) return;
      final cached = await _repository.readCachedUser();
      state = AuthState(
        status: cached != null ? AuthStatus.authenticated : AuthStatus.unauthenticated,
        user: cached,
        isLoading: false,
      );
    }
  }

  Future<LoginResult> login({
    required String email,
    required String password,
    required bool rememberMe,
    String? expectedRole,
  }) async {
    _bumpSessionEpoch();
    state = state.copyWith(isLoading: true, clearError: true, clearTwoFactor: true);
    try {
      final result = await _repository.login(
        email: email,
        password: password,
        rememberMe: rememberMe,
        expectedRole: expectedRole,
      );
      switch (result) {
        case LoginSuccess(:final user):
          state = AuthState(
            status: AuthStatus.authenticated,
            user: user,
            isLoading: false,
          );
        case LoginTwoFactorRequired(:final email):
          state = AuthState(
            status: AuthStatus.unauthenticated,
            isLoading: false,
            pendingTwoFactorEmail: email,
          );
      }
      return result;
    } on ApiException catch (e) {
      state = AuthState(
        status: AuthStatus.unauthenticated,
        isLoading: false,
        errorMessage: e.message,
      );
      rethrow;
    }
  }

  Future<void> verifyTwoFactor({
    required String email,
    required String code,
    required bool rememberMe,
  }) async {
    _bumpSessionEpoch();
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final user = await _repository.verifyLoginTwoFactor(
        email: email,
        code: code,
        rememberMe: rememberMe,
      );
      state = AuthState(
        status: AuthStatus.authenticated,
        user: user,
        isLoading: false,
      );
    } on ApiException catch (e) {
      state = AuthState(
        status: AuthStatus.unauthenticated,
        isLoading: false,
        errorMessage: e.message,
        pendingTwoFactorEmail: email,
      );
      rethrow;
    }
  }

  Future<UserProfile> refreshProfile() async {
    final profile = await _repository.fetchProfile();
    state = state.copyWith(user: profile);
    return profile;
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AuthState(status: AuthStatus.unauthenticated, isLoading: false);
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    ref.watch(apiClientProvider),
    ref.watch(tokenStorageProvider),
    ref.watch(offlineCacheServiceProvider),
  );
});

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    ref.watch(authRepositoryProvider),
    ref.watch(permissionServiceProvider), // from permission_service.dart
  );
});
