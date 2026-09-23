import { useEffect, type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import { applyDocumentLanguage } from '@/locales/i18n';

/**
 * Keeps document lang/dir/font in sync with the active i18n language
 * across the entire app (including portals that inherit from document).
 */
export function LanguageFontProvider({ children }: PropsWithChildren) {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    applyDocumentLanguage(i18n.resolvedLanguage || i18n.language);
  }, [i18n.language, i18n.resolvedLanguage]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const onLanguageChanged = (lng: string) => {
      applyDocumentLanguage(lng);
    };

    i18n.on('languageChanged', onLanguageChanged);
    return () => {
      i18n.off('languageChanged', onLanguageChanged);
    };
  }, [i18n]);

  return <>{children}</>;
}
