import { User } from 'lucide-react';
import { hasUploadedProfileImage, resolveProfileImage } from '@/utils/profileImage';
import { getEntityIconStyle, usesPersonAvatar } from '@/utils/entityIcons';

type EntityAvatarProps = {
  entityPath: string;
  item?: Record<string, unknown> | null;
  label?: string;
  className?: string;
};

function getItemImage(item?: Record<string, unknown> | null): string {
  const candidates = [
    item?.profileImage,
    item?.profilePhoto,
    item?.avatar,
    item?.photo,
    item?.image,
    item?.imageUrl,
    item?.thumbnail,
    item?.profileUrl
  ];

  const match = candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return match ?? '';
}

function resolvePersonRole(entityPath: string, item?: Record<string, unknown> | null) {
  if (typeof item?.role === 'string' && item.role.trim()) {
    return item.role;
  }

  if (entityPath === '/students') return 'student';
  if (entityPath === '/teachers') return 'teacher';
  return 'default';
}

export function EntityAvatar({
  entityPath,
  item,
  label = '',
  className = 'h-20 w-20'
}: EntityAvatarProps) {
  const displayName = label.trim() || 'Item';

  if (!usesPersonAvatar(entityPath)) {
    const { icon: Icon, iconClassName, backgroundClassName } = getEntityIconStyle(entityPath);

    return (
      <div
        className={`mx-auto flex ${className} items-center justify-center overflow-hidden rounded-full border border-white/15 bg-gradient-to-br ${backgroundClassName} shadow-[0_18px_45px_rgba(14,165,233,0.16)]`}
        aria-hidden="true"
      >
        <Icon className={`h-9 w-9 ${iconClassName}`} strokeWidth={1.8} />
      </div>
    );
  }

  const uploadedImage = getItemImage(item);
  const hasPhoto = hasUploadedProfileImage(uploadedImage);

  if (!hasPhoto) {
    return (
      <div
        className={`mx-auto flex ${className} items-center justify-center overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-slate-500/20 via-slate-400/10 to-slate-500/20 text-slate-500 shadow-[0_18px_45px_rgba(14,165,233,0.10)] dark:text-slate-300`}
        aria-hidden="true"
      >
        <User className="h-9 w-9" strokeWidth={1.6} />
      </div>
    );
  }

  const image = resolveProfileImage({
    uploadedImage,
    role: resolvePersonRole(entityPath, item),
    label: displayName
  });

  return (
    <div className={`mx-auto flex ${className} items-center justify-center overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-sky-500/20 via-cyan-400/10 to-emerald-400/20 text-xl font-semibold text-white shadow-[0_18px_45px_rgba(14,165,233,0.16)]`}>
      <img
        src={image}
        alt={displayName}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={(event) => {
          const target = event.currentTarget;
          target.onerror = null;
          target.src = resolveProfileImage({
            role: resolvePersonRole(entityPath, item)
          });
        }}
      />
    </div>
  );
}
