import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authService } from '@/features/auth/services/authService';

type CaptchaChallengeProps = {
  challengeId: string;
  answer: string;
  onChallengeIdChange: (challengeId: string) => void;
  onAnswerChange: (answer: string) => void;
  disabled?: boolean;
  isDark?: boolean;
  compact?: boolean;
};

export function CaptchaChallengeField({
  challengeId,
  answer,
  onChallengeIdChange,
  onAnswerChange,
  disabled = false,
  isDark = true,
  compact = false
}: CaptchaChallengeProps) {
  const { t } = useTranslation();
  const [svg, setSvg] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const theme = isDark ? 'dark' : 'light';

  async function loadChallenge() {
    // Self-hosted SVG CAPTCHA — works with local backend online or offline (no CDN/internet vendor).
    setLoading(true);
    setLoadError('');
    onAnswerChange('');
    try {
      const data = await authService.getCaptcha(theme);
      onChallengeIdChange(data.challengeId);
      setSvg(data.svg);
    } catch {
      onChallengeIdChange('');
      setSvg('');
      setLoadError(
        t('auth.captcha_load_failed', {
          defaultValue: 'Unable to load CAPTCHA. Start the local server and refresh.'
        })
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadChallenge();
    // Reload when theme flips so light/dark SVG backgrounds stay in sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'} aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="captchaAnswer" className={`block text-xs font-medium sm:text-sm ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>
          {t('auth.captcha_label', { defaultValue: 'Security check' })}
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs"
          disabled={disabled || loading}
          onClick={() => void loadChallenge()}
          aria-label={t('auth.captcha_refresh', { defaultValue: 'Refresh CAPTCHA' })}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          {t('auth.captcha_refresh', { defaultValue: 'Refresh' })}
        </Button>
      </div>

      <div
        className={`overflow-hidden rounded-xl border ${compact ? 'p-2' : 'p-3'} ${
          isDark ? 'border-white/10 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
        }`}
      >
        {svg ? (
          <div
            className={`mx-auto flex items-center justify-center ${compact ? 'min-h-[56px] scale-[0.92]' : 'min-h-[72px]'}`}
            dangerouslySetInnerHTML={{ __html: svg }}
            aria-hidden="true"
          />
        ) : (
          <p className={`text-center text-sm ${compact ? 'py-3' : 'py-6'} ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {loading ? t('common.loading') : loadError || t('auth.captcha_unavailable', { defaultValue: 'CAPTCHA unavailable' })}
          </p>
        )}
      </div>

      <Input
        id="captchaAnswer"
        name="captchaAnswer"
        value={answer}
        onChange={(event) => onAnswerChange(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        disabled={disabled || !challengeId}
        placeholder={t('auth.captcha_placeholder', { defaultValue: 'Enter the characters shown above' })}
        aria-required="true"
        aria-describedby="captcha-help"
        className={isDark ? 'bg-white/5 tracking-[0.2em]' : 'bg-white tracking-[0.2em]'}
      />
      <p id="captcha-help" className={`leading-snug ${compact ? 'sr-only' : 'text-[11px]'} ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {t('auth.captcha_help', { defaultValue: 'Letters and numbers are case-insensitive. Refresh if the image is hard to read.' })}
      </p>
      {loadError ? <p className={`text-xs ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>{loadError}</p> : null}
    </div>
  );
}
