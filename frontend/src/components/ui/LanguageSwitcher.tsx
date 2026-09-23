import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { applyDocumentLanguage, languageMeta, type AppLanguage } from '@/locales/i18n';
import { Select } from '@/components/ui/Select';

const languages = (Object.entries(languageMeta) as Array<[AppLanguage, (typeof languageMeta)[AppLanguage]]>).map(([code, meta]) => ({
  code,
  name: meta.label
}));

interface LanguageSwitcherProps {
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();

  const changeLanguage = async (lng: string) => {
    localStorage.setItem('lang', lng);
    await i18n.changeLanguage(lng);
    applyDocumentLanguage(lng);
  };

  return (
    <div className="language-switcher-shell flex min-w-0 items-center gap-2">
      <Globe className="h-4 w-4" />
      {compact ? (
        <div className="min-w-[132px]">
          <Select
            value={i18n.resolvedLanguage || 'en'}
            options={languages.map((lang) => ({ value: lang.code, label: lang.name }))}
            onChange={(value) => changeLanguage(String(value))}
            placeholder={t('common.language', { defaultValue: 'Language' })}
          />
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {languages.map((lang) => (
            <Button
              key={lang.code}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => changeLanguage(lang.code)}
              className={`language-control-button px-2.5 py-1 text-xs ${i18n.resolvedLanguage === lang.code ? 'language-control-button-active' : ''}`}
              data-language={lang.code}
              aria-label={`Switch language to ${lang.code}`}
              aria-pressed={i18n.resolvedLanguage === lang.code}
            >
              {lang.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
