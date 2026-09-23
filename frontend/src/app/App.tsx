import { useEffect } from 'react';
import AppRoutes from '@/routes/AppRoutes';
import { OfflineStatus } from '@/components/OfflineStatus';
import { flushPublicContactOutbox } from '@/services/offlineOutbox';

export default function App() {
  useEffect(() => {
    const syncQueuedMessages = () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      void flushPublicContactOutbox();
    };

    syncQueuedMessages();

    const handleOnline = () => syncQueuedMessages();
    const handleFocus = () => syncQueuedMessages();
    // Keep background sync light so it does not compete with live API traffic.
    const intervalId = window.setInterval(syncQueuedMessages, 60_000);

    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return (
    <>
      <OfflineStatus />
      <AppRoutes />
    </>
  );
}
