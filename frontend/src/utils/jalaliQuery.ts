import { jalaliInputToIsoDate } from './jalaliDateInput';

export function jalaliRangeToApiQuery(startDate?: string, endDate?: string) {
  return {
    startDate: startDate ? jalaliInputToIsoDate(startDate) ?? undefined : undefined,
    endDate: endDate ? jalaliInputToIsoDate(endDate) ?? undefined : undefined
  };
}
