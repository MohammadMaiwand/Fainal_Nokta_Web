import { useEffect, useState } from 'react';
import { X, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function OfflineStatus() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setDismissed(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline || dismissed) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed bottom-4 left-4 right-4 z-20 flex justify-center sm:left-auto sm:right-5 sm:justify-end"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex max-w-md items-center gap-2 rounded-full border border-amber-300/40 bg-amber-950/90 px-3 py-2 text-sm font-medium text-amber-50 shadow-lg shadow-black/20 backdrop-blur-md">
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">{t('common.offline_mode')}</span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-amber-100 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-200"
          aria-label={t('common.close', { defaultValue: 'Close' })}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
