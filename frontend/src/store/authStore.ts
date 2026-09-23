import { create } from 'zustand';
import { normalizeRole, type Role } from '@/features/resources/config/modules';
import { clearAuthSession, getStoredAuthValue, getStoredUser, isRememberedSession, persistAuthSession } from '@/features/auth/utils/authStorage';

function clearOfflineApiCacheLocal() {
  if (typeof window === 'undefined') return;
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith('nokta-api-cache:') || key?.startsWith('nokta-outbox:') || key === 'nokta-selected-registration') {
      keys.push(key);
    }
  }
  keys.forEach((key) => window.localStorage.removeItem(key));
}

interface UserProfile {
  id: string;
  name: string;
  fullName?: string;
  username?: string;
  email: string;
  phone?: string;
  profileImage?: string;
  status?: string;
  branchId?: string | null;
  role: Role;
  originalRole?: string;
  canonicalRole?: string;
  permissions?: Record<string, string[]>;
  permissionKeys?: string[];
  revokedPermissionKeys?: string[];
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  authLoading: boolean;
  setAuth: (user: UserProfile | null, accessToken?: string | null, refreshToken?: string | null, rememberMe?: boolean) => void;
  setLoading: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser<UserProfile>(),
  accessToken: getStoredAuthValue('accessToken'),
  refreshToken: getStoredAuthValue('refreshToken'),
  authLoading: true,
  setAuth: (user, accessToken, refreshToken, rememberMe = isRememberedSession()) => {
    const normalizedUser = user
      ? {
          ...user,
          originalRole: user.originalRole ?? user.role,
          role: (normalizeRole(user.role) ?? user.role) as Role,
          canonicalRole: normalizeRole(user.role) ?? user.role
        }
      : null;

    persistAuthSession({
      accessToken: accessToken ?? null,
      refreshToken: refreshToken ?? null,
      user: normalizedUser,
      rememberMe
    });

    set({ user: normalizedUser, accessToken: accessToken ?? null, refreshToken: refreshToken ?? null });
  },
  setLoading: (authLoading) => set({ authLoading }),
  logout: () => {
    clearOfflineApiCacheLocal();
    clearAuthSession();
    set({ user: null, accessToken: null, refreshToken: null, authLoading: false });
  }
}));
