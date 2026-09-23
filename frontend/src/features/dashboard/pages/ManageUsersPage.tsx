import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, CheckCircle2, ArrowUpDown } from 'lucide-react';
import { PageHeader, SearchFilterBar, DataTable, FormModal } from '@/shared/components/Common';
import { ListPagination } from '@/shared/filters/ListPagination';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { userService } from '@/features/users/services/userService';
import { useAuthStore } from '@/store/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import { sortCollection, type ListSortDirection, type ListSortField } from '@/utils/listSearchSort';

interface PermissionModule {
  key: string;
  label: string;
  actions: string[];
}

interface PermissionTemplateResponse {
  modules: PermissionModule[];
  roleTemplates: Record<string, Record<string, string[]>>;
}

interface UserRecord {
  _id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  permissions?: Record<string, string[]>;
}

interface ApiResponse<T> {
  data: T;
}

const roles = ['super_admin', 'admin', 'teacher', 'student', 'parent', 'owner', 'branch_manager', 'system_automation', 'family_student', 'accountant', 'librarian'] as const;

const moduleLabelMap: Record<string, string> = {
  dashboard: 'common.dashboard',
  users: 'common.users',
  students: 'common.students',
  teachers: 'common.teachers',
  classes: 'common.classes',
  subjects: 'common.subjects',
  exams: 'common.exams',
  results: 'common.results',
  finance: 'common.finance',
  expenses: 'common.expenses',
  families: 'common.families',
  books: 'common.books',
  notifications: 'common.notifications',
  audit: 'common.audit_logs',
  roles: 'common.roles'
};

const actionLabelMap: Record<string, string> = {
  create: 'common.create',
  read: 'common.read',
  update: 'common.update',
  delete: 'common.delete'
};

export function ManageUsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<ListSortField>('name');
  const [sortDirection, setSortDirection] = useState<ListSortDirection>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'teacher' });
  const [permissionState, setPermissionState] = useState<Record<string, string[]>>({});
  const [copySourceId, setCopySourceId] = useState('');
  const user = useAuthStore((state) => state.user);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const templateQuery = useQuery<ApiResponse<PermissionTemplateResponse>>({
    queryKey: ['permissionsTemplate'],
    queryFn: userService.getPermissionTemplate
  });

  const usersQuery = useQuery({
    queryKey: ['users', page, pageSize, debouncedSearch, sortField, sortDirection],
    queryFn: () =>
      userService.list({
        page,
        limit: pageSize,
        search: debouncedSearch,
        sortBy: sortField,
        sortOrder: sortDirection
      })
  });

  const createUserMutation = useMutation({
    mutationFn: userService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'teacher' });
    }
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: Record<string, string[]> }) =>
      userService.updatePermissions(id, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsPermissionsOpen(false);
      setSelectedUser(null);
    }
  });

  const users = (usersQuery.data?.data ?? []) as UserRecord[];
  const pagination = (usersQuery.data?.pagination ?? { page, limit: pageSize, total: users.length }) as {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
  };
  const sortedUsers = useMemo(() => sortCollection(users, sortField, sortDirection), [sortDirection, sortField, users]);
  const template = templateQuery.data?.data;
  const sortOptions = useMemo(
    () => [
      { value: 'name', label: t('common.sort_name', { defaultValue: 'Sort by Name' }) },
      { value: 'role', label: t('common.sort_role', { defaultValue: 'Sort by Role' }) }
    ],
    [t]
  );

  const columns = useMemo(
    () => [
      { key: 'name', label: t('common.name') },
      { key: 'email', label: t('common.email') },
      {
        key: 'role',
        label: t('common.role'),
        render: (item: UserRecord) => t(`common.${item.role}`, { defaultValue: item.role })
      },
      {
        key: 'active',
        label: t('common.active'),
        render: (item: UserRecord) => (
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
            {item.active ? t('common.active') : '-'}
          </span>
        )
      }
    ],
    [t]
  );

  const translateModuleLabel = (moduleKey: string) => t(moduleLabelMap[moduleKey] ?? moduleKey, { defaultValue: moduleKey });
  const translateActionLabel = (action: string) => t(actionLabelMap[action] ?? action, { defaultValue: action });

  const handleOpenPermissions = (userRecord: UserRecord) => {
    setSelectedUser(userRecord);
    setPermissionState(userRecord.permissions ?? {});
    setCopySourceId('');
    setIsPermissionsOpen(true);
  };

  const handlePermissionToggle = (moduleKey: string, action: string) => {
    setPermissionState((current) => {
      const existing = current[moduleKey] ?? [];
      const next = existing.includes(action)
        ? existing.filter((value) => value !== action)
        : [...existing, action];
      return { ...current, [moduleKey]: next };
    });
  };

  const handleModuleToggle = (moduleKey: string, actions: string[]) => {
    setPermissionState((current) => {
      const existing = current[moduleKey] ?? [];
      const allSelected = actions.every((action) => existing.includes(action));
      return { ...current, [moduleKey]: allSelected ? [] : actions };
    });
  };

  const handleFullAccessToggle = () => {
    if (!template) return;
    const allSelected = template.modules.every((module) => {
      const assigned = permissionState[module.key] ?? [];
      return assigned.length === module.actions.length;
    });
    if (allSelected) {
      setPermissionState({});
      return;
    }
    const allPermissions = template.modules.reduce((acc, module) => {
      acc[module.key] = [...module.actions];
      return acc;
    }, {} as Record<string, string[]>);
    setPermissionState(allPermissions);
  };

  const handleCopyFromUser = (sourceId: string) => {
    setCopySourceId(sourceId);
    const sourceUser = users.find((item) => item._id === sourceId);
    if (sourceUser) {
      setPermissionState(sourceUser.permissions ?? {});
    }
  };

  const handleApplyRoleTemplate = (role: string) => {
    if (!template) return;
    const roleTemplate = template.roleTemplates[role] ?? {};
    const next = template.modules.reduce((acc, module) => {
      acc[module.key] = roleTemplate[module.key] ?? [];
      return acc;
    }, {} as Record<string, string[]>);
    setPermissionState(next);
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createUserMutation.mutateAsync(newUser);
  };

  const handlePermissionsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser) return;
    await updatePermissionsMutation.mutateAsync({ id: selectedUser._id, permissions: permissionState });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="dashboard.manage_users_permissions"
        description="dashboard.manage_users_description"
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" /> {t('dashboard.create_user')}
          </Button>
        }
      />

      <Card className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <SearchFilterBar
            value={search}
            onChange={setSearch}
            placeholder={t('common.search_placeholder', { entity: t('common.users') })}
            createVisible={false}
            extraActions={
              <>
                <div className="w-full sm:w-56">
                  <Select
                    value={sortField}
                    options={sortOptions}
                    placeholder={t('common.sort', { defaultValue: 'Sort' })}
                    onChange={(value) => setSortField(String(value) as ListSortField)}
                  />
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}>
                  <ArrowUpDown className="h-4 w-4" />
                  {t(sortDirection === 'asc' ? 'common.ascending' : 'common.descending', {
                    defaultValue: sortDirection === 'asc' ? 'ASC' : 'DESC'
                  })}
                </Button>
              </>
            }
          />
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{t('dashboard.signed_in_as')}</span>
            <span className="rounded-full bg-slate-800 px-3 py-2 text-sm text-white">
              {user?.role ? t(`common.${user.role}`, { defaultValue: user.role }) : t('common.guest')}
            </span>
          </div>
        </div>

        <DataTable
          columns={columns}
          items={sortedUsers}
          actions={[
            {
              label: t('dashboard.permissions'),
              onClick: handleOpenPermissions,
              variant: 'solid'
            }
          ]}
        />
        <ListPagination
          meta={pagination}
          onPageChange={setPage}
          onLimitChange={(limit) => {
            setPageSize(limit);
            setPage(1);
          }}
        />
      </Card>

      <FormModal
        open={isCreateOpen}
        title={t('dashboard.create_user')}
        submitLabel={t('common.create')}
        loading={createUserMutation.status === 'pending'}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
      >
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-200">{t('dashboard.full_name')}</label>
            <Input
              value={newUser.name}
              onChange={(event) => setNewUser({ ...newUser, name: event.target.value })}
              placeholder={t('common.full_name')}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-200">{t('dashboard.email')}</label>
            <Input
              type="email"
              value={newUser.email}
              onChange={(event) => setNewUser({ ...newUser, email: event.target.value })}
              placeholder={t('common.email_address')}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-200">{t('dashboard.password')}</label>
            <Input
              type="password"
              value={newUser.password}
              onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
              placeholder={t('dashboard.password')}
              required
            />
            <p className="mt-2 text-xs text-slate-400">{t('auth.password_length_hint', { defaultValue: 'Any password is accepted.' })}</p>
          </div>
          <label className="block text-sm font-semibold text-slate-200">{t('dashboard.role')}</label>
          <select
            className="w-full rounded-2xl border border-white/15 bg-white/8 px-3 py-3 text-sm text-slate-100 shadow-[0_10px_36px_rgba(15,23,42,0.18)] backdrop-blur-xl outline-none transition hover:border-sky-300/40 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25"
            value={newUser.role}
            onChange={(event) => setNewUser({ ...newUser, role: event.target.value })}
          >
            {roles.map((roleOption) => (
              <option key={roleOption} value={roleOption} className="bg-slate-950 text-slate-100">
                {t(`common.${roleOption}`)}
              </option>
            ))}
          </select>
        </div>
      </FormModal>

      <FormModal
        open={isPermissionsOpen}
        title={t('dashboard.edit_permissions', { name: selectedUser?.name ?? t('common.user') })}
        submitLabel={t('dashboard.save_permissions')}
        loading={updatePermissionsMutation.status === 'pending'}
        onClose={() => setIsPermissionsOpen(false)}
        onSubmit={handlePermissionsSubmit}
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Button type="button" variant="outline" onClick={handleFullAccessToggle}>
              <CheckCircle2 className="h-4 w-4" /> {t('dashboard.toggle_full_access')}
            </Button>
            <div className="sm:col-span-2 grid gap-2">
              <label className="text-sm font-semibold text-slate-200">{t('dashboard.copy_from_user')}</label>
              <select
                className="w-full rounded-2xl border border-white/15 bg-white/8 px-3 py-3 text-sm text-slate-100 shadow-[0_10px_36px_rgba(15,23,42,0.18)] backdrop-blur-xl outline-none transition hover:border-sky-300/40 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25"
                value={copySourceId}
                onChange={(event) => handleCopyFromUser(event.target.value)}
              >
                <option value="">{t('dashboard.select_user_to_copy')}</option>
                {users
                  .filter((option) => option._id !== selectedUser?._id)
                  .map((option) => (
                    <option key={option._id} value={option._id}>
                      {option.name} ({t(`common.${option.role}`, { defaultValue: option.role })})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-200">{t('dashboard.role_template')}</label>
              <select
                className="mt-2 w-full rounded-2xl border border-white/15 bg-white/8 px-3 py-3 text-sm text-slate-100 shadow-[0_10px_36px_rgba(15,23,42,0.18)] backdrop-blur-xl outline-none transition hover:border-sky-300/40 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25"
                value={selectedUser?.role ?? ''}
                onChange={(event) => handleApplyRoleTemplate(event.target.value)}
              >
                <option value="">{t('dashboard.choose_role_template')}</option>
                {Object.keys(template?.roleTemplates ?? {}).map((roleOption) => (
                  <option key={roleOption} value={roleOption}>
                    {t(`common.${roleOption}`, { defaultValue: roleOption })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {template?.modules.map((module) => {
            const current = permissionState[module.key] ?? [];
            const allSelected = module.actions.every((action) => current.includes(action));
            return (
              <Card key={module.key} className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur-xl">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{translateModuleLabel(module.key)}</h3>
                    <p className="text-sm text-slate-400">{t('dashboard.allowed_actions')}</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => handleModuleToggle(module.key, module.actions)}>
                    {allSelected ? t('dashboard.clear_module') : t('dashboard.select_all')}
                  </Button>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  {module.actions.map((action) => (
                    <label key={action} className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-100 transition hover:border-sky-300/40 hover:bg-sky-500/10">
                      <input
                        type="checkbox"
                        checked={current.includes(action)}
                        onChange={() => handlePermissionToggle(module.key, action)}
                        className="h-4 w-4 rounded border-slate-400/80 bg-slate-950 text-sky-400 shadow-[0_0_0_1px_rgba(148,163,184,0.25)] focus:ring-2 focus:ring-sky-400"
                      />
                      {translateActionLabel(action)}
                    </label>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </FormModal>
    </div>
  );
}
