import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { localeMessages } from '@/locales/messages';

type LocaleTree = Record<string, unknown>;
type FlatTranslations = Record<string, string>;

function flattenLocale(source: LocaleTree, prefix = '', flat: FlatTranslations = {}) {
  for (const [key, value] of Object.entries(source)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      flat[nextKey] = value;
      if (!Object.prototype.hasOwnProperty.call(flat, key)) {
        flat[key] = value;
      }
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenLocale(value as LocaleTree, nextKey, flat);
    }
  }

  return flat;
}

export const languageMeta = {
  en: { dir: 'ltr', label: 'English' },
  fa: { dir: 'rtl', label: 'Dari' },
  ps: { dir: 'rtl', label: 'Pashto' }
} as const;

export type AppLanguage = keyof typeof languageMeta;

const FONT_ENGLISH = "'Inter', Arial, sans-serif";
const FONT_RTL = "'Vazirmatn', Tahoma, Arial, sans-serif";

export function normalizeAppLanguage(locale?: string) {
  return String(locale || 'en')
    .toLowerCase()
    .split('-')[0];
}

export function isDariLanguage(language: string) {
  return language === 'fa' || language === 'prs' || language === 'dr';
}

export function isPashtoLanguage(language: string) {
  return language === 'ps';
}

export function isRtlLanguage(language: string) {
  return isDariLanguage(language) || isPashtoLanguage(language);
}

export function getLanguageDirection(language?: string) {
  const normalized = normalizeAppLanguage(language);
  return isRtlLanguage(normalized) ? 'rtl' : 'ltr';
}

/**
 * Syncs document lang, dir, and global app font with the active locale.
 * Safe to call on startup, language change, and route hydration.
 */
export function applyDocumentLanguage(locale?: string) {
  if (typeof document === 'undefined') return;

  const normalizedLanguage = normalizeAppLanguage(locale);
  const isRtl = isRtlLanguage(normalizedLanguage);
  const direction = isRtl ? 'rtl' : 'ltr';
  const fontFamily = isRtl ? FONT_RTL : FONT_ENGLISH;

  const root = document.documentElement;
  root.lang = normalizedLanguage;
  root.dir = direction;
  root.dataset.lang = normalizedLanguage;
  root.style.setProperty('--app-font-family', fontFamily);

  if (document.body) {
    document.body.dir = direction;
  }
}

const storedLanguage =
  (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'en';
const defaultLanguage = (normalizeAppLanguage(storedLanguage) as AppLanguage) || 'en';
const resolvedStartupLanguage = (['en', 'fa', 'ps'].includes(defaultLanguage)
  ? defaultLanguage
  : isDariLanguage(defaultLanguage)
    ? 'fa'
    : isPashtoLanguage(defaultLanguage)
      ? 'ps'
      : 'en') as AppLanguage;

applyDocumentLanguage(resolvedStartupLanguage);

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: flattenLocale(localeMessages.en as LocaleTree) },
    fa: { translation: flattenLocale(localeMessages.fa as LocaleTree) },
    ps: { translation: flattenLocale(localeMessages.ps as LocaleTree) }
  },
  lng: resolvedStartupLanguage,
  fallbackLng: 'en',
  supportedLngs: ['en', 'fa', 'ps'],
  defaultNS: 'translation',
  interpolation: { escapeValue: false },
  returnEmptyString: false
});

export default i18n;
