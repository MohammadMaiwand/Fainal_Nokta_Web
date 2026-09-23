import { normalizeRole, type Role } from '@/features/resources/config/modules';

const ROLE_AVATAR_COLORS: Record<string, { from: string; to: string }> = {
  student: { from: '#0ea5e9', to: '#22c55e' },
  teacher: { from: '#8b5cf6', to: '#06b6d4' },
  parent: { from: '#f59e0b', to: '#ef4444' },
  admin: { from: '#6366f1', to: '#14b8a6' },
  super_admin: { from: '#ec4899', to: '#8b5cf6' },
  owner: { from: '#f97316', to: '#eab308' },
  branch_manager: { from: '#10b981', to: '#3b82f6' },
  default: { from: '#64748b', to: '#334155' }
};

/** Neutral user-icon placeholder — never letters from the account name. */
function buildDefaultAvatarDataUri(role?: string | null) {
  const palette = ROLE_AVATAR_COLORS[role ?? ''] ?? ROLE_AVATAR_COLORS.default;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="User">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${palette.from}" />
        <stop offset="100%" stop-color="${palette.to}" />
      </linearGradient>
    </defs>
    <rect width="96" height="96" rx="48" fill="url(#g)" />
    <circle cx="48" cy="36" r="14" fill="#ffffff" fill-opacity="0.92"/>
    <path d="M22 78c0-14.4 11.6-26 26-26s26 11.6 26 26" fill="#ffffff" fill-opacity="0.92"/>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function normalizeImageSource(value?: string | null) {
  const source = String(value ?? '').trim();
  if (!source) return '';
  if (/^https?:\/\//i.test(source) || source.startsWith('data:image/')) {
    return source;
  }

  if (source.startsWith('/uploads/') || source.startsWith('uploads/')) {
    const normalizedPath = source.startsWith('/') ? source : `/${source}`;
    return normalizedPath;
  }

  if (source.startsWith('/')) return source;
  return source;
}

export function hasUploadedProfileImage(value?: string | null) {
  const source = String(value ?? '').trim();
  if (!source) return false;
  // Generated placeholder data-URIs are not real uploads
  if (source.startsWith('data:image/svg+xml')) return false;
  return Boolean(normalizeImageSource(source));
}

export function resolveProfileImage(options: {
  uploadedImage?: string | null;
  role?: Role | string | null;
  label?: string;
}) {
  const uploaded = normalizeImageSource(options.uploadedImage);
  if (uploaded && !uploaded.startsWith('data:image/svg+xml')) {
    return uploaded;
  }

  const normalizedRole = normalizeRole(options.role as Role | null | undefined);
  return buildDefaultAvatarDataUri(normalizedRole ?? options.role ?? 'default');
}
