import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/app/providers/ThemeProvider';

export type SelectOption = {
  value: string;
  label: string;
};

interface SelectProps {
  id?: string;
  label?: string;
  value: string | string[];
  options: SelectOption[];
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  title?: string;
  onChange: (value: string | string[]) => void;
}

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export function Select({ id, label, value, options, multiple = false, placeholder, disabled = false, invalid = false, title, onChange }: SelectProps) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isRtl = i18n.resolvedLanguage !== 'en';

  const updateDropdownPosition = () => {
    if (!buttonRef.current) {
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const desiredHeight = Math.min(Math.max(options.length * 52 + 24, 132), 320);
    const spaceBelow = viewportHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUpward = spaceBelow < Math.min(desiredHeight, 220) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(132, Math.min(desiredHeight, openUpward ? spaceAbove : spaceBelow));
    const top = openUpward
      ? Math.max(8, rect.top - maxHeight - 8)
      : Math.min(viewportHeight - maxHeight - 8, rect.bottom + 8);

    setDropdownPosition({
      top,
      left: rect.left,
      width: rect.width,
      maxHeight
    });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();
  }, [isOpen, options.length, value]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleViewportChange = () => updateDropdownPosition();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen, options.length]);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const selectedOptions = options.filter((option) => selectedValues.includes(option.value));

  const toggleOption = (optionValue: string) => {
    if (multiple) {
      const next = selectedValues.includes(optionValue)
        ? selectedValues.filter((item) => item !== optionValue)
        : [...selectedValues, optionValue];
      onChange(next);
      return;
    }

    onChange(optionValue);
    setIsOpen(false);
  };

  const displayLabel = selectedOptions.length
    ? selectedOptions.map((option) => option.label).join(', ')
    : placeholder ?? t('common.search');

  const dropdown = isOpen && dropdownPosition
    ? createPortal(
        <div
          ref={dropdownRef}
          role="listbox"
          className={`fixed z-[2000] overflow-hidden rounded-[1.75rem] border p-2 shadow-[0_24px_80px_rgba(15,23,42,0.38)] transition-all duration-200 ${
            isDark
              ? 'border-white/12 bg-slate-950 backdrop-blur-2xl'
              : 'border-slate-200 bg-white'
          }`}
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          <div className="custom-scrollbar overflow-y-auto pr-1" style={{ maxHeight: `${dropdownPosition.maxHeight}px` }}>
            {options.length ? (
              <div className="space-y-1">
                {options.map((option) => {
                  const selected = selectedValues.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleOption(option.value)}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm transition duration-200 ${
                        selected
                          ? isDark
                            ? 'border-sky-400/40 bg-sky-500/12 text-slate-50 shadow-[0_0_0_1px_rgba(56,189,248,0.1)]'
                            : 'border-sky-200 bg-sky-50 text-sky-900 shadow-[0_0_0_1px_rgba(14,165,233,0.08)]'
                          : isDark
                            ? 'border-transparent text-slate-100 hover:border-white/10 hover:bg-white/8'
                            : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50'
                      } ${isRtl ? 'text-right' : 'text-left'}`}
                    >
                      <span className="truncate">{option.label}</span>
                      {selected && <Check className="h-4 w-4 shrink-0 text-sky-400" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={`px-4 py-3 text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>{t('common.no_data')}</div>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div ref={containerRef} className="relative w-full text-sm">
        <button
          ref={buttonRef}
          type="button"
          title={title}
          onClick={() => {
            if (disabled) return;
            setIsOpen((current) => !current);
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-[0_12px_40px_rgba(15,23,42,0.22)] backdrop-blur-xl transition duration-200 focus:outline-none focus:ring-2 ${
            invalid
              ? isDark
                ? 'border-rose-400/80 bg-rose-500/10 text-slate-100 focus:border-rose-400 focus:ring-rose-400/30'
                : 'border-rose-400 bg-rose-50 text-slate-900 focus:border-rose-500 focus:ring-rose-500/25'
              : isDark
                ? disabled
                  ? 'cursor-not-allowed border-white/10 bg-slate-950/50 text-slate-500'
                  : 'border-white/15 bg-slate-950/80 text-slate-100 hover:border-sky-300/50 hover:bg-slate-900/85 focus:border-sky-400 focus:ring-sky-300/30'
                : disabled
                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                  : 'border-slate-300/80 bg-white/95 text-slate-900 hover:border-sky-400 hover:bg-white focus:border-sky-500 focus:ring-sky-300/30'
          } ${isRtl ? 'text-right' : 'text-left'}`}
          id={id}
        >
          <div className={`flex flex-wrap items-center gap-2 ${isRtl ? 'pr-1' : 'pl-1'}`}>
            {selectedOptions.length ? (
              selectedOptions.map((option) => (
                <span
                  key={option.value}
                  className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-xs font-medium ${
                    isDark ? 'border-white/10 bg-slate-800/80 text-slate-100' : 'border-slate-200 bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                </span>
              ))
            ) : (
              <span className={isDark ? 'text-slate-300' : 'text-slate-500'}>{displayLabel}</span>
            )}
          </div>
          <ChevronDown className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 transition-transform duration-200 ${isDark ? 'text-slate-300' : 'text-slate-500'} ${isOpen ? 'rotate-180' : ''} ${isRtl ? 'left-4' : 'right-4'}`} />
        </button>
      </div>
      {dropdown}
    </>
  );
}
