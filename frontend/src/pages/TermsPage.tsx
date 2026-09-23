import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function TermsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-slate-800 dark:text-slate-100">
      <h1 className="mb-6 text-3xl font-bold">{t('legal.terms_title', { defaultValue: 'Terms of Use' })}</h1>
      <div className="prose prose-slate dark:prose-invert max-w-none space-y-4 text-sm leading-relaxed">
        <p>{t('legal.terms_intro', { defaultValue: 'By using Nokta Academy you agree to use the system responsibly and only for authorized school operations.' })}</p>
        <p>{t('legal.terms_accounts', { defaultValue: 'Accounts are personal. Do not share passwords. Report suspicious activity to administrators immediately.' })}</p>
        <p>{t('legal.terms_availability', { defaultValue: 'The platform may undergo maintenance. Critical academic records remain protected during scheduled updates.' })}</p>
      </div>
      <Link to="/home" className="mt-8 inline-block text-sky-600 hover:text-sky-500 dark:text-sky-300">
        {t('common.back_to_home', { defaultValue: 'Back to Main' })}
      </Link>
    </div>
  );
}
