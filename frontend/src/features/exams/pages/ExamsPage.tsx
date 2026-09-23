import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { normalizeRole } from '@/features/resources/config/modules';
import { ExamsManagePage } from './ExamsManagePage';
import { StudentExamsPage } from './StudentExamsPage';

export function ExamsPage() {
  const user = useAuthStore((state) => state.user);
  const role = useMemo(() => normalizeRole(user?.role), [user?.role]);

  if (role === 'student' || role === 'parent') {
    return <StudentExamsPage />;
  }

  return <ExamsManagePage />;
}
