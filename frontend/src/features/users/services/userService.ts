import { api } from '@/services/apiClient';

export const userService = {
  list: (params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    role?: string;
    status?: string;
    branchId?: string;
  }) => api.get('/users', { params }).then((res) => res.data),
  get: (id: string) => api.get(`/users/${id}`).then((res) => res.data),
  create: (payload: { name: string; email: string; password: string; role: string }) =>
    api.post('/users', payload).then((res) => res.data),
  updatePermissions: (id: string, permissions: Record<string, string[]>) =>
    api.put(`/users/${id}/permissions`, { permissions }).then((res) => res.data),
  getPermissionTemplate: () => api.get('/permissions/template').then((res) => res.data)
};
