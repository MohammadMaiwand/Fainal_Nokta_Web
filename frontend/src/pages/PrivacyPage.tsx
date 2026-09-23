import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-slate-800 dark:text-slate-100">
      <h1 className="mb-6 text-3xl font-bold">{t('legal.privacy_title', { defaultValue: 'Privacy Policy' })}</h1>
      <div className="prose prose-slate dark:prose-invert max-w-none space-y-4 text-sm leading-relaxed">
        <p>{t('legal.privacy_intro', { defaultValue: 'Nokta Academy protects student, teacher, and staff data according to school management best practices.' })}</p>
        <p>{t('legal.privacy_data', { defaultValue: 'We collect account, academic, attendance, and finance data required to operate the academy. Data is stored securely and accessed only by authorized roles.' })}</p>
        <p>{t('legal.privacy_contact', { defaultValue: 'For privacy requests, contact your academy administrator.' })}</p>
      </div>
      <Link to="/home" className="mt-8 inline-block text-sky-600 hover:text-sky-500 dark:text-sky-300">
        {t('common.back_to_home', { defaultValue: 'Back to Main' })}
      </Link>
    </div>
  );
}
