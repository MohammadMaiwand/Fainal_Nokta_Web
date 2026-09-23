import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from '@/app/App';
import { AppProviders } from '@/app/providers/AppProviders';
import { initializeThemePreference } from '@/app/providers/ThemeProvider';
import '@/locales/i18n';
import '@/styles/index.css';
import { initMonitoring } from '@/utils/monitoring';
import { resolveApiClientBase } from '@/services/apiClient';

initializeThemePreference();
initMonitoring();

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}

// Render immediately — API base discovery runs in background so first paint is not blocked.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
);

void resolveApiClientBase().catch(() => undefined);
