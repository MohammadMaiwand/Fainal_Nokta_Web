import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/apiClient';

type SearchItem = {
  id: string;
  title: string;
  subtitle: string;
  path: string;
  type: string;
};

type SearchResponse = {
  students: SearchItem[];
  teachers: SearchItem[];
  classes: SearchItem[];
  subjects: SearchItem[];
  payments: SearchItem[];
};

export function GlobalSearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', query],
    queryFn: () => api.get('/search/global', { params: { q: query, limit: 8 } }).then((res) => res.data.data as SearchResponse),
    enabled: query.trim().length >= 2
  });

  const flatResults = useMemo(() => {
    if (!data) return [];
    return Object.values(data).flat();
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="app-surface rounded-2xl p-4">
        <label className="mb-2 block text-sm font-medium">{t('common.global_search')}</label>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
          <Search size={16} className="text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('common.search')}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="app-surface rounded-2xl p-4">
        {isFetching ? <p className="app-text-muted text-sm">{t('common.loading')}</p> : null}
        {!isFetching && query.trim().length >= 2 && flatResults.length === 0 ? (
          <p className="app-text-muted text-sm">{t('common.no_records_found')}</p>
        ) : null}
        <div className="space-y-2">
          {flatResults.map((item) => (
            <button
              type="button"
              key={`${item.type}-${item.id}`}
              className="w-full rounded-xl border border-slate-200/60 p-3 text-start transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              onClick={() => navigate(item.path)}
            >
              <div className="text-sm font-semibold">{item.title}</div>
              <div className="app-text-muted text-xs">{item.subtitle}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
