import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getPrintDirection, printElement, type PrintOptions, type PrintOrientation } from './printElement';

export function usePrint(defaultOptions?: Omit<PrintOptions, 'target' | 'onEmpty'>) {
  const { t, i18n } = useTranslation();
  const [printing, setPrinting] = useState(false);
  const [message, setMessage] = useState('');
  const locked = useRef(false);

  const print = useCallback(
    async (overrides?: PrintOptions) => {
      if (locked.current) return false;
      locked.current = true;
      setPrinting(true);
      setMessage('');

      const language = overrides?.documentLanguage || i18n.resolvedLanguage || i18n.language || 'en';
      const orientation = (overrides?.orientation || defaultOptions?.orientation || 'portrait') as PrintOrientation;

      try {
        const ok = await printElement({
          ...defaultOptions,
          ...overrides,
          documentLanguage: language,
          direction: overrides?.direction || defaultOptions?.direction || getPrintDirection(language),
          orientation,
          onEmpty: () => {
            setMessage(t('print.no_data'));
            overrides?.onEmpty?.();
          }
        });
        return ok;
      } finally {
        locked.current = false;
        setPrinting(false);
      }
    },
    [defaultOptions, i18n.language, i18n.resolvedLanguage, t]
  );

  return { print, printing, message, setMessage };
}
