import { useState } from 'react';
import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/apiClient';
import { hasUploadedProfileImage, resolveProfileImage } from '@/utils/profileImage';

type ProfileImageFieldProps = {
  value?: string;
  label: string;
  role?: string;
  name?: string;
  onChange: (value: string) => void;
};

export function ProfileImageField({ value = '', label, role, name, onChange }: ProfileImageFieldProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [broken, setBroken] = useState(false);

  const hasPhoto = hasUploadedProfileImage(value) && !broken;
  const preview = hasPhoto ? resolveProfileImage({ uploadedImage: value, role, label: name || label }) : '';

  const handleUpload = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    setError('');
    setBroken(false);
    try {
      const formData = new FormData();
      formData.append('profileImage', file);
      const response = await api.post('/uploads/profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const imageUrl = response.data?.data?.profileImage ?? '';
      onChange(imageUrl);
    } catch (uploadError: any) {
      setError(uploadError?.response?.data?.message || uploadError?.message || t('common.upload_failed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">{label}</label>
      <div className="flex items-center gap-4">
        {hasPhoto ? (
          <img
            src={preview}
            alt={label}
            className="h-16 w-16 rounded-full border object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300"
            aria-hidden="true"
          >
            <User className="h-7 w-7" strokeWidth={1.6} />
          </div>
        )}
        <div className="space-y-2">
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={(event) => void handleUpload(event.target.files?.[0])}
            disabled={uploading}
          />
          <p className="text-xs opacity-70">{t('common.profile_image_hint')}</p>
          {uploading && <p className="text-xs">{t('common.uploading')}</p>}
          {error && <p className="text-xs text-rose-500">{error}</p>}
        </div>
      </div>
      <input type="hidden" value={value} readOnly />
    </div>
  );
}
