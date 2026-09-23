import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PageHeader, DataTable, FormModal } from '@/shared/components/Common';
import { rolesService, type RoleRecord } from '@/features/roles/services/rolesService';
import { useTheme } from '@/app/providers/ThemeProvider';

type RoleDraft = {
  slug: string;
  name: string;
  description: string;
  scope: string;
  permissionKeys: string[];
};

export function RolesPage() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const panelClass = isDark ? 'bg-slate-950/70 text-slate-100' : 'bg-slate-50 text-slate-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-slate-600';
  const titleClass = isDark ? 'text-white' : 'text-slate-900';

  const scopeOptions = useMemo(
    () => [
      { value: 'global', label: t('roles.scope_global') },
      { value: 'operational', label: t('roles.scope_operational') },
      { value: 'instructional', label: t('roles.scope_instructional') },
      { value: 'self', label: t('roles.scope_self') },
      { value: 'linked-family', label: t('roles.scope_linked_family') },
      { value: 'governance', label: t('roles.scope_governance') },
      { value: 'branch', label: t('roles.scope_branch') },
      { value: 'service', label: t('roles.scope_service') }
    ],
    [t]
  );
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [draft, setDraft] = useState<RoleDraft | null>(null);
  const [formError, setFormError] = useState('');

  const { data: roles, isLoading, isError } = useQuery({
    queryKey: ['roles-overview'],
    queryFn: rolesService.list
  });

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['role-templates'],
    queryFn: rolesService.templates
  });

  const permissionModules = useMemo(() => {
    const modules = new Set<string>();
    (roles ?? []).forEach((role) => role.permissions.forEach((permission) => modules.add(permission.module)));
    return Array.from(modules).sort();
  }, [roles]);

  const saveMutation = useMutation({
    mutationFn: async (payload: RoleDraft) => {
      if (!editingRole) {
        throw new Error('Role context is missing');
      }

      if (editingRole.hasCustomization) {
        return rolesService.update(editingRole.slug, {
          name: payload.name,
          description: payload.description,
          scope: payload.scope,
          permissionKeys: payload.permissionKeys
        });
      }

      return rolesService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-overview'] });
      setEditingRole(null);
      setDraft(null);
      setFormError('');
    },
    onError: (error: any) => {
      setFormError(error?.response?.data?.message ?? error?.message ?? 'Unable to save role profile.');
    }
  });

  const resetMutation = useMutation({
    mutationFn: (slug: string) => rolesService.remove(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-overview'] });
    }
  });

  const openEditor = (role: RoleRecord) => {
    setEditingRole(role);
    setDraft({
      slug: role.slug,
      name: role.name,
      description: role.description,
      scope: role.scope,
      permissionKeys: [...role.permissionKeys]
    });
    setFormError('');
  };

  const togglePermission = (permissionKey: string) => {
    if (!draft) {
      return;
    }

    if (draft.slug === 'super_admin') {
      return;
    }

    setDraft({
      ...draft,
      permissionKeys: draft.permissionKeys.includes(permissionKey)
        ? draft.permissionKeys.filter((item) => item !== permissionKey)
        : [...draft.permissionKeys, permissionKey]
    });
  };

  const matrixColumns = [
    {
      key: 'role',
      label: 'Role',
      render: (role: RoleRecord) => role.name
    },
    ...permissionModules.map((module) => ({
      key: module,
      label: module,
      render: (role: RoleRecord) => {
        const actions = role.permissions.filter((permission) => permission.module === module).map((permission) => permission.action);
        return actions.length ? actions.join(', ') : '-';
      }
    }))
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="common.roles" description="roles.roles_overview" />
        <div className="grid gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="p-6 animate-pulse">
              <div className="h-4 w-24 rounded bg-slate-700" />
              <div className="mt-4 h-8 w-32 rounded bg-slate-700" />
              <div className="mt-6 h-24 rounded bg-slate-800" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="common.roles"
        description="roles.roles_overview"
        actions={
          <div className={`rounded-2xl border px-4 py-3 text-sm ${isDark ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
            {t('roles.roles_hint')}
          </div>
        }
      />

      {isError && <Card className="p-6 text-rose-600 dark:text-rose-200">{t('roles.unable_load_roles')}</Card>}

      <div className="grid gap-4 xl:grid-cols-4">
        {(roles ?? []).map((role) => (
          <Card key={role.slug} className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-sm uppercase tracking-[0.3em] ${mutedClass}`}>{role.scope}</p>
                <h2 className={`mt-3 text-2xl font-semibold ${titleClass}`}>{role.name}</h2>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs ${role.hasCustomization ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' : isDark ? 'border-slate-700 bg-slate-900/70 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                {role.hasCustomization ? t('roles.customized') : t('roles.default')}
              </span>
            </div>
            <p className={`mt-2 text-sm ${mutedClass}`}>{role.description}</p>
            <div className="mt-6 grid gap-3">
              <div className={`rounded-2xl p-4 ${panelClass}`}><div className={`text-sm ${mutedClass}`}>{t('roles.users_count')}</div><div className={`mt-1 text-xl font-semibold ${titleClass}`}>{role.userCount}</div></div>
              <div className={`rounded-2xl p-4 ${panelClass}`}><div className={`text-sm ${mutedClass}`}>{t('roles.permissions_count')}</div><div className={`mt-1 text-xl font-semibold ${titleClass}`}>{role.permissionCount}</div></div>
              <div className={`rounded-2xl p-4 ${panelClass}`}><div className={`text-sm ${mutedClass}`}>{t('roles.branch_access')}</div><div className={`mt-1 text-xl font-semibold ${titleClass}`}>{role.branchAccess.scope} ({role.branchAccess.count})</div></div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => openEditor(role)}>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                {role.hasCustomization ? t('roles.edit_profile') : t('roles.customize')}
              </Button>
              {role.hasCustomization && role.slug !== 'super_admin' && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={resetMutation.isPending}
                  onClick={() => resetMutation.mutate(role.slug)}
                >
                  {t('roles.reset_to_default')}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-sky-300" />
          <p className={`text-sm uppercase tracking-[0.3em] ${mutedClass}`}>{t('roles.permission_matrix')}</p>
        </div>
        <div className="mt-4">
          <DataTable columns={matrixColumns} items={roles ?? []} />
        </div>
      </Card>

      <Card className="p-6">
        <p className={`text-sm uppercase tracking-[0.3em] ${mutedClass}`}>{t('roles.permission_templates')}</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {(templates?.modules ?? []).map((module) => (
            <div key={module.key} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-800/80 bg-slate-950/70' : 'border-slate-200 bg-slate-50'}`}>
              <div className={`text-sm uppercase tracking-[0.2em] ${mutedClass}`}>{module.label}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {module.actions.map((action) => (
                  <span key={`${module.key}-${action}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                    {action}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {!templatesLoading && !(templates?.modules ?? []).length && (
            <div className={`text-sm ${mutedClass}`}>{t('roles.no_templates')}</div>
          )}
        </div>
      </Card>

      {editingRole && draft && (
        <FormModal
          open={Boolean(editingRole)}
          title={`${editingRole.hasCustomization ? 'Edit' : 'Create'} Role Profile`}
          onClose={() => {
            setEditingRole(null);
            setDraft(null);
            setFormError('');
          }}
          onSubmit={(event) => {
            event.preventDefault();

            if (!draft.name.trim()) {
              setFormError('Role name is required.');
              return;
            }

            if (!draft.permissionKeys.length) {
              setFormError('Select at least one permission.');
              return;
            }

            saveMutation.mutate(draft);
          }}
          submitLabel={editingRole.hasCustomization ? 'Update Role Profile' : 'Create Role Profile'}
          loading={saveMutation.isPending}
        >
          {formError && <div className="rounded-2xl border border-rose-500/50 bg-rose-500/10 p-3 text-sm text-rose-200">{formError}</div>}

          <div>
            <label className="mb-1 block text-sm text-slate-300">Role Slug</label>
            <Input value={draft.slug} disabled />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Name</label>
            <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Scope</label>
            <Select
              value={draft.scope}
              options={scopeOptions}
              onChange={(value) => setDraft({ ...draft, scope: String(value) })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Description</label>
            <textarea
              rows={4}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none backdrop-blur-sm transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-3">
            <div className="text-sm text-slate-300">Permissions</div>
            {draft.slug === 'super_admin' && (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                Super admin keeps the full permission baseline to avoid governance lockout.
              </div>
            )}
            <div className="grid gap-4">
              {(templates?.modules ?? []).map((module) => (
                <div key={module.key} className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4">
                  <div className="text-sm uppercase tracking-[0.2em] text-slate-400">{module.label}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {module.actions.map((action) => {
                      const permissionKey = `${module.key}_${action}`.toUpperCase();
                      const selected = draft.permissionKeys.includes(permissionKey);
                      return (
                        <button
                          key={permissionKey}
                          type="button"
                          disabled={draft.slug === 'super_admin'}
                          onClick={() => togglePermission(permissionKey)}
                          className={`rounded-full border px-3 py-1 text-xs transition ${
                            selected
                              ? 'border-sky-400/40 bg-sky-500/15 text-sky-100'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                          } ${draft.slug === 'super_admin' ? 'cursor-not-allowed opacity-80' : ''}`}
                        >
                          {action}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FormModal>
      )}
    </div>
  );
}
