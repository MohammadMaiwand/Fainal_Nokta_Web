import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Reply, XCircle, Mail, Send } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { normalizeRole } from '@/features/resources/config/modules';
import { api } from '@/services/apiClient';
import { messagesService, type MessageItem } from '../services/messagesService';
import { flushPublicContactOutbox, getQueuedPublicContacts, type QueuedPublicContact } from '@/services/offlineOutbox';

type TabKey = 'inbox' | 'sent' | 'admin';
type AdminComposeTarget = 'student' | 'teacher';
type TeacherComposeTarget = 'admin' | 'student';

const statusOptions = ['', 'unread', 'read', 'replied', 'closed'] as const;
const categoryOptions = ['', 'student', 'teacher', 'customer', 'support', 'academic', 'finance'] as const;

function pickList(payload: any): any[] {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function studentLabel(item: any) {
  return (
    item?.studentDisplay?.fullName
    || [item?.firstName, item?.lastName].filter(Boolean).join(' ')
    || item?.name
    || item?.studentId
    || String(item?._id || '')
  );
}

function teacherLabel(item: any) {
  return item?.name || item?.email || String(item?._id || '');
}

export function MessagesPage() {
  const { t } = useTranslation('messages');
  const user = useAuthStore((state) => state.user);
  const role = normalizeRole(user?.role);
  const isAdminView = ['super_admin', 'admin', 'branch_manager', 'owner'].includes(role ?? '');
  const canCompose = role !== 'owner' && role !== 'parent';
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<TabKey>(isAdminView ? 'admin' : 'inbox');
  const [filters, setFilters] = useState({ category: '', status: '', priority: '', search: '' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeTarget, setComposeTarget] = useState<'teacher' | 'admin'>('teacher');
  const [adminComposeTarget, setAdminComposeTarget] = useState<AdminComposeTarget>('student');
  const [teacherComposeTarget, setTeacherComposeTarget] = useState<TeacherComposeTarget>('admin');
  const [composeRecipientId, setComposeRecipientId] = useState('');
  const [composeError, setComposeError] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [queuedContacts, setQueuedContacts] = useState<QueuedPublicContact[]>([]);
  const [syncingQueue, setSyncingQueue] = useState(false);

  const refreshQueuedContacts = () => {
    setQueuedContacts(getQueuedPublicContacts());
  };

  useEffect(() => {
    refreshQueuedContacts();
  }, []);

  useEffect(() => {
    if (!isAdminView) {
      return;
    }

    const syncQueue = async () => {
      setSyncingQueue(true);
      try {
        const result = await flushPublicContactOutbox();
        if (result.sent > 0) {
          await queryClient.invalidateQueries({ queryKey: ['messages'] });
          await queryClient.invalidateQueries({ queryKey: ['messages-admin-summary'] });
        }
      } finally {
        refreshQueuedContacts();
        setSyncingQueue(false);
      }
    };

    void syncQueue();
    const intervalId = window.setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      void syncQueue();
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [isAdminView, queryClient]);

  const listQuery = useQuery({
    queryKey: ['messages', tab, filters, role],
    queryFn: async () => {
      const params = {
        category: filters.category || undefined,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        search: filters.search || undefined
      };
      if (tab === 'admin') return messagesService.adminInbox(params);
      if (tab === 'sent') return messagesService.sent(params);
      return messagesService.inbox(params);
    }
  });

  const summaryQuery = useQuery({
    queryKey: ['messages-admin-summary'],
    queryFn: () => messagesService.adminSummary(),
    enabled: isAdminView
  });

  const detailQuery = useQuery({
    queryKey: ['message-detail', selectedId],
    queryFn: () => messagesService.getById(selectedId as string),
    enabled: Boolean(selectedId)
  });

  const recipientsQuery = useQuery({
    queryKey: ['messages-compose-recipients', role, adminComposeTarget, teacherComposeTarget, composeOpen],
    enabled: composeOpen && (isAdminView || role === 'teacher'),
    queryFn: async () => {
      if (isAdminView) {
        if (adminComposeTarget === 'student') {
          const res = await api.get('/students', { params: { limit: 200 } });
          return pickList(res.data).map((item) => ({ id: String(item._id), label: studentLabel(item) }));
        }
        const res = await api.get('/teachers', { params: { limit: 200 } });
        return pickList(res.data).map((item) => ({
          id: String(item.userId || item._id),
          label: teacherLabel(item)
        }));
      }
      if (role === 'teacher' && teacherComposeTarget === 'student') {
        const res = await api.get('/students', { params: { limit: 200 } });
        return pickList(res.data).map((item) => ({ id: String(item._id), label: studentLabel(item) }));
      }
      return [];
    }
  });

  const items = (listQuery.data?.data ?? []) as MessageItem[];
  const selected = detailQuery.data ?? items.find((item) => item._id === selectedId) ?? null;

  const createMutation = useMutation({
    mutationFn: async () => {
      setComposeError('');
      if (role === 'student') {
        return messagesService.create({
          subject: composeSubject,
          message: composeBody,
          ...(composeTarget === 'admin'
            ? { recipientRole: 'admin', targetGroup: 'admin' }
            : {})
        });
      }
      if (role === 'teacher') {
        if (teacherComposeTarget === 'student') {
          if (!composeRecipientId) throw new Error(t('recipient_required'));
          return messagesService.create({
            subject: composeSubject,
            message: composeBody,
            studentId: composeRecipientId,
            category: 'academic'
          });
        }
        return messagesService.create({
          subject: composeSubject,
          message: composeBody
        });
      }
      if (isAdminView) {
        if (!composeRecipientId) throw new Error(t('recipient_required'));
        return messagesService.create({
          subject: composeSubject,
          message: composeBody,
          category: 'academic',
          ...(adminComposeTarget === 'student'
            ? { studentId: composeRecipientId }
            : { teacherId: composeRecipientId })
        });
      }
      throw new Error(t('compose_forbidden'));
    },
    onSuccess: () => {
      setComposeOpen(false);
      setComposeSubject('');
      setComposeBody('');
      setComposeRecipientId('');
      setComposeError('');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages-unread-count'] });
    },
    onError: (error: any) => {
      setComposeError(error?.response?.data?.message || error?.message || t('send_failed'));
    }
  });

  const replyMutation = useMutation({
    mutationFn: () => messagesService.reply(selectedId as string, replyBody),
    onSuccess: () => {
      setReplyBody('');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['message-detail', selectedId] });
    }
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => messagesService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] })
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => messagesService.close(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] })
  });

  const summaryCards = useMemo(() => {
    const summary = summaryQuery.data;
    if (!summary) return [];
    return [
      { label: t('summary_total'), value: summary.total },
      { label: t('summary_unread'), value: summary.unread },
      { label: t('filter_students'), value: summary.students },
      { label: t('filter_teachers'), value: summary.teachers },
      { label: t('filter_customers'), value: summary.customers }
    ];
  }, [summaryQuery.data, t]);

  const canReply =
    selected &&
    selected.status !== 'closed' &&
    (isAdminView || role === 'teacher' || role === 'student');

  const canClose = selected && isAdminView && selected.status !== 'closed';

  const openCompose = () => {
    setComposeError('');
    setComposeRecipientId('');
    setComposeOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{t('module_label')}</p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('title')}</h1>
        </div>
        {canCompose && (
          <Button onClick={openCompose}>
            <Send size={16} className="me-2" />
            {t('new_message')}
          </Button>
        )}
      </div>

      {isAdminView && queuedContacts.length > 0 && (
        <Card className="border-amber-300/40 bg-amber-50 p-4 dark:border-amber-400/30 dark:bg-amber-500/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{t('pending_contact_title')}</p>
              <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-100/80">
                {t('pending_contact_description', { count: queuedContacts.length })}
              </p>
            </div>
            <Button
              variant="ghost"
              disabled={syncingQueue}
              onClick={async () => {
                setSyncingQueue(true);
                try {
                  const result = await flushPublicContactOutbox();
                  if (result.sent > 0) {
                    await queryClient.invalidateQueries({ queryKey: ['messages'] });
                    await queryClient.invalidateQueries({ queryKey: ['messages-admin-summary'] });
                  }
                } finally {
                  refreshQueuedContacts();
                  setSyncingQueue(false);
                }
              }}
            >
              {syncingQueue ? t('pending_contact_syncing') : t('pending_contact_sync_now')}
            </Button>
          </div>
        </Card>
      )}

      {isAdminView && summaryCards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => (
            <Card key={card.label} className="p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{card.value}</p>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {isAdminView && (
            <Button variant={tab === 'admin' ? 'primary' : 'ghost'} onClick={() => setTab('admin')}>
              {t('admin_inbox')}
            </Button>
          )}
          <Button variant={tab === 'inbox' ? 'primary' : 'ghost'} onClick={() => setTab('inbox')}>
            <Mail size={16} className="me-2" />
            {t('inbox')}
          </Button>
          <Button variant={tab === 'sent' ? 'primary' : 'ghost'} onClick={() => setTab('sent')}>
            {t('sent')}
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100"
            value={filters.category}
            onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
          >
            {categoryOptions.map((value) => (
              <option key={value || 'all'} value={value}>
                {value ? t(`category_${value}`) : t('filter_all_categories')}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100"
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
          >
            {statusOptions.map((value) => (
              <option key={value || 'all'} value={value}>
                {value ? t(`status_${value}`) : t('filter_all_statuses')}
              </option>
            ))}
          </select>
          <Input
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            placeholder={t('search_placeholder')}
          />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="overflow-hidden p-0">
          <div className="max-h-[32rem] overflow-y-auto divide-y divide-slate-200 dark:divide-white/10">
            {listQuery.isLoading && <p className="p-4 text-sm text-slate-500 dark:text-slate-400">{t('loading')}</p>}
            {!listQuery.isLoading && items.length === 0 && queuedContacts.length === 0 && (
              <p className="p-4 text-sm text-slate-500 dark:text-slate-400">{t('empty')}</p>
            )}
            {isAdminView && tab === 'admin' && queuedContacts.map((item) => (
              <div
                key={item.id}
                className="flex w-full items-start gap-3 border-b border-amber-200/70 bg-amber-50/70 px-4 py-3 text-start dark:border-amber-400/20 dark:bg-amber-500/10"
              >
                <MessageSquare size={18} className="mt-1 shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {item.payload.subject || t('no_subject')}
                    </p>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                      {t('pending_contact_badge')}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{item.payload.message}</p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {item.payload.name}
                    {item.payload.phone ? ` • ${item.payload.phone}` : ''}
                    {item.payload.email ? ` • ${item.payload.email}` : ''}
                  </p>
                </div>
              </div>
            ))}
            {items.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => {
                  setSelectedId(item._id);
                  if (item.status === 'unread') readMutation.mutate(item._id);
                }}
                className={`flex w-full items-start gap-3 px-4 py-3 text-start transition hover:bg-slate-50 dark:hover:bg-white/5 ${
                  selectedId === item._id ? 'bg-sky-50 dark:bg-sky-500/10' : ''
                }`}
              >
                <MessageSquare size={18} className="mt-1 shrink-0 text-sky-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {item.subject || t('no_subject')}
                    </p>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {t(`status_${item.status}`)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{item.body}</p>
                  <p className="mt-2 text-[11px] text-slate-400">{item.senderName || item.senderRole}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          {!selected && <p className="text-sm text-slate-500 dark:text-slate-400">{t('select_message')}</p>}
          {selected && (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('detail_title')}</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{selected.subject || t('no_subject')}</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{selected.body}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{t(`category_${selected.category}`)}</span>
                <span>{t(`status_${selected.status}`)}</span>
                <span>{t(`priority_${selected.priority}`)}</span>
              </div>
              {canReply && (
                <div className="space-y-2">
                  <textarea
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100"
                    placeholder={t('reply_placeholder')}
                  />
                  <Button onClick={() => replyMutation.mutate()} disabled={!replyBody.trim() || replyMutation.isPending}>
                    <Reply size={16} className="me-2" />
                    {t('reply')}
                  </Button>
                </div>
              )}
              {canClose && (
                <Button variant="ghost" onClick={() => closeMutation.mutate(selected._id)}>
                  <XCircle size={16} className="me-2" />
                  {t('close')}
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>

      {composeOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <Card className="w-full max-w-lg p-5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('new_message')}</h3>
            {role === 'student' && (
              <div className="mt-3 flex gap-2">
                <Button variant={composeTarget === 'teacher' ? 'primary' : 'ghost'} onClick={() => setComposeTarget('teacher')}>
                  {t('to_teacher')}
                </Button>
                <Button variant={composeTarget === 'admin' ? 'primary' : 'ghost'} onClick={() => setComposeTarget('admin')}>
                  {t('to_admin')}
                </Button>
              </div>
            )}
            {role === 'teacher' && (
              <div className="mt-3 flex gap-2">
                <Button
                  variant={teacherComposeTarget === 'admin' ? 'primary' : 'ghost'}
                  onClick={() => {
                    setTeacherComposeTarget('admin');
                    setComposeRecipientId('');
                  }}
                >
                  {t('to_admin')}
                </Button>
                <Button
                  variant={teacherComposeTarget === 'student' ? 'primary' : 'ghost'}
                  onClick={() => {
                    setTeacherComposeTarget('student');
                    setComposeRecipientId('');
                  }}
                >
                  {t('to_student')}
                </Button>
              </div>
            )}
            {isAdminView && (
              <div className="mt-3 flex gap-2">
                <Button
                  variant={adminComposeTarget === 'student' ? 'primary' : 'ghost'}
                  onClick={() => {
                    setAdminComposeTarget('student');
                    setComposeRecipientId('');
                  }}
                >
                  {t('to_student')}
                </Button>
                <Button
                  variant={adminComposeTarget === 'teacher' ? 'primary' : 'ghost'}
                  onClick={() => {
                    setAdminComposeTarget('teacher');
                    setComposeRecipientId('');
                  }}
                >
                  {t('to_teacher')}
                </Button>
              </div>
            )}
            <div className="mt-4 space-y-3">
              {(isAdminView || (role === 'teacher' && teacherComposeTarget === 'student')) && (
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100"
                  value={composeRecipientId}
                  onChange={(event) => setComposeRecipientId(event.target.value)}
                >
                  <option value="">{t('select_recipient')}</option>
                  {(recipientsQuery.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              )}
              <Input value={composeSubject} onChange={(event) => setComposeSubject(event.target.value)} placeholder={t('subject_placeholder')} />
              <textarea
                value={composeBody}
                onChange={(event) => setComposeBody(event.target.value)}
                rows={5}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100"
                placeholder={t('body_placeholder')}
              />
              {composeError && <p className="text-sm text-rose-600 dark:text-rose-300">{composeError}</p>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setComposeOpen(false)}>{t('cancel')}</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!composeBody.trim() || createMutation.isPending}>
                {t('send')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
