import { QRCodeSVG } from 'qrcode.react';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  buildPhoneQrValue,
  buildWhatsAppUrl,
  formatPhoneDisplay
} from '@/utils/phoneContact';
import { isPhoneLikeFieldName, isValidAfghanPhone } from '@/utils/formValidation';

type PhoneContactVariant = 'card' | 'inline' | 'form-preview';

interface PhoneContactBlockProps {
  phone?: string | null;
  whatsapp?: string | null;
  label?: string;
  variant?: PhoneContactVariant;
  className?: string;
}

export function PhoneContactBlock({
  phone,
  whatsapp,
  label,
  variant = 'card',
  className = ''
}: PhoneContactBlockProps) {
  const { t } = useTranslation();
  const displayPhone = formatPhoneDisplay(phone);
  const displayWhatsapp = formatPhoneDisplay(whatsapp);
  const primaryPhone = displayPhone || displayWhatsapp;

  if (!primaryPhone || !isValidAfghanPhone(primaryPhone)) {
    return null;
  }

  const whatsappUrl = buildWhatsAppUrl(phone, whatsapp);
  const qrValue = buildPhoneQrValue(phone, whatsapp);
  const qrSize = variant === 'form-preview' ? 72 : variant === 'inline' ? 56 : 96;

  const whatsappButton = whatsappUrl ? (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] font-semibold text-white transition hover:bg-[#1ebe57] ${
        variant === 'inline' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
      }`}
      aria-label={t('common.open_whatsapp')}
    >
      <MessageCircle className={variant === 'inline' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      {variant !== 'inline' ? t('common.open_whatsapp') : t('common.whatsapp')}
    </a>
  ) : null;

  if (variant === 'inline') {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <span>{primaryPhone}</span>
        {whatsappButton}
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 p-3 ${
        variant === 'form-preview' ? 'mt-2' : ''
      } ${className}`}
    >
      {label ? <p className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p> : null}
      <p className="text-sm font-medium text-slate-100">{primaryPhone}</p>
      {displayWhatsapp && displayWhatsapp !== displayPhone ? (
        <p className="mt-1 text-xs text-slate-400">
          {t('common.whatsapp')}: {displayWhatsapp}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {qrValue ? (
          <div className="rounded-xl bg-white p-2 shadow-sm" title={t('common.phone_qr_hint', { defaultValue: 'Scan to open WhatsApp or call' })}>
            <QRCodeSVG value={qrValue} size={qrSize} level="M" includeMargin />
          </div>
        ) : null}
        <div className="flex flex-col gap-2">{whatsappButton}</div>
      </div>
    </div>
  );
}

interface PhoneFieldRowProps {
  label: string;
  phone?: string | null;
  whatsapp?: string | null;
  notAvailable: string;
}

export function PhoneFieldRow({ label, phone, whatsapp, notAvailable }: PhoneFieldRowProps) {
  const display = formatPhoneDisplay(phone) || formatPhoneDisplay(whatsapp);
  if (!display) {
    return (
      <p>
        {label}: {notAvailable}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p>{label}</p>
      <PhoneContactBlock phone={phone} whatsapp={whatsapp} variant="card" />
    </div>
  );
}

export function isPhoneListFieldKey(fieldKey: string): boolean {
  return isPhoneLikeFieldName(fieldKey);
}
