import { useEffect, useState } from 'react';
import { api } from '@/services/apiClient';
import type { ModuleField } from '@/features/resources/config/modules';

export type SelectOption = {
  value: string;
  label: string;
  classId?: string | null;
};

const SELECT_OPTIONS_CACHE_TTL_MS = 120_000;
const SELECT_OPTIONS_PAGE_SIZE = 100;
const selectOptionsCache = new Map<string, { loadedAt: number; options: SelectOption[] }>();

function parseSelectOptions(field: ModuleField, items: unknown[]): SelectOption[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item: any) => {
    const value = String(field.optionValueKey ? item[field.optionValueKey] : item.id ?? item._id ?? '');
    const labelKey = field.optionLabelKey ?? 'name';
    const resolvedLabel = labelKey.split('.').reduce((acc: any, pathPart) => acc?.[pathPart], item);
    const fallbackLabel = [item.firstName, item.lastName].filter(Boolean).join(' ').trim() || item.name || item.title || value;
    const label = String(resolvedLabel ?? fallbackLabel);
    return { value, label, classId: item.classId ? String(item.classId?._id ?? item.classId) : null };
  });
}

export function useSelectOptions(fields: ModuleField[]) {
  const [options, setOptions] = useState<Record<string, SelectOption[]>>({});

  useEffect(() => {
    const dynamicFields = fields.filter((field) => field.type === 'select' && field.optionsEndpoint);
    if (!dynamicFields.length) {
      setOptions({});
      return;
    }

    let active = true;

    const loadOptions = async () => {
      const loadedOptions: Record<string, SelectOption[]> = {};
      const now = Date.now();

      await Promise.all(
        dynamicFields.map(async (field) => {
          const endpoint = field.optionsEndpoint!;
          const cacheKey = `${endpoint}:${field.optionValueKey ?? ''}:${field.optionLabelKey ?? ''}`;
          const cached = selectOptionsCache.get(cacheKey);

          if (cached && now - cached.loadedAt < SELECT_OPTIONS_CACHE_TTL_MS) {
            loadedOptions[field.name] = cached.options;
            return;
          }

          try {
            const response = await api.get(endpoint, { params: { limit: SELECT_OPTIONS_PAGE_SIZE } });
            const parsedOptions = parseSelectOptions(field, response.data?.data ?? []);
            selectOptionsCache.set(cacheKey, { loadedAt: now, options: parsedOptions });
            loadedOptions[field.name] = parsedOptions;
          } catch {
            loadedOptions[field.name] = [];
          }
        })
      );

      if (active) {
        setOptions(loadedOptions);
      }
    };

    void loadOptions();

    return () => {
      active = false;
    };
  }, [fields]);

  return options;
}
