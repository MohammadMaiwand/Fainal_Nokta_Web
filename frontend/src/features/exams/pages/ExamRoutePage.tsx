import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { normalizeRole } from '@/features/resources/config/modules';
import { ExamDetailPage } from './ExamDetailPage';
import { StudentExamTakePage } from './StudentExamTakePage';

export function ExamRoutePage() {
  const user = useAuthStore((state) => state.user);
  const role = useMemo(() => normalizeRole(user?.role), [user?.role]);

  if (role === 'student' || role === 'parent') {
    return <StudentExamTakePage />;
  }

  return <ExamDetailPage />;
}
