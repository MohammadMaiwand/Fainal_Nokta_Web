import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, School } from 'lucide-react';
import { AfghaniIcon } from '@/components/icons/AfghaniIcon';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { dashboardService } from '@/features/dashboard/services/dashboardService';
import { formatCurrency, formatNumber } from '@/utils/formatters';

type EcommerceCard = {
  key: 'incomeTotal' | 'expenseTotal' | 'totalBooks' | 'totalClasses';
  label: string;
  icon: LucideIcon;
  currency?: boolean;
};

export function EcommercePage() {
  const { t, i18n } = useTranslation();
  const { data } = useQuery({
    queryKey: ['ecommerceSummary'],
    queryFn: () => dashboardService.summary()
  });

  const cards: EcommerceCard[] = [
    { key: 'incomeTotal', label: t('common.total_income'), icon: AfghaniIcon, currency: true },
    { key: 'expenseTotal', label: t('finance.total_expenses'), icon: AfghaniIcon, currency: true },
    { key: 'totalBooks', label: t('dashboard.total_books'), icon: BookOpen },
    { key: 'totalClasses', label: t('dashboard.total_classes'), icon: School }
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t('dashboard.ecommerce')}</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">{t('common.reports')}</h2>
        <p className="mt-2 max-w-3xl text-slate-400">{t('common.view_financial_reports')}</p>
      </Card>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.key} className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-wider text-slate-400">{card.label}</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">
                  {card.currency
                    ? formatCurrency(data?.[card.key] ?? 0, i18n.resolvedLanguage)
                    : formatNumber(data?.[card.key] ?? 0, i18n.resolvedLanguage)}
                </h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-primary via-secondary to-accent text-white">
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-white">{t('common.finance')}</h3>
          <p className="mt-3 text-slate-400">{t('common.chart_monthly_finance')}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-white">{t('common.books')}</h3>
          <p className="mt-3 text-slate-400">{t('issue_books.inventory')}</p>
        </Card>
      </section>
    </div>
  );
}
