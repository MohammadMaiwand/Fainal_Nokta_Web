import { api } from '@/services/apiClient';
import { postPublicContact, submitPublicContact, type PublicContactPayload } from '@/services/offlineOutbox';

export type MessageItem = {
  _id: string;
  senderId?: string | null;
  senderRole: string;
  senderName?: string;
  senderEmail?: string;
  recipientId?: string | null;
  recipientRole?: string;
  subject?: string;
  body: string;
  category: string;
  messageType: string;
  status: 'unread' | 'read' | 'replied' | 'closed';
  priority: 'low' | 'normal' | 'high';
  createdAt: string;
  updatedAt?: string;
  studentId?: string | null;
  teacherId?: string | null;
  teacherName?: string;
};

export type MessageFilters = {
  category?: string;
  status?: string;
  priority?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export const messagesService = {
  inbox: (filters: MessageFilters = {}) =>
    api.get('/messages/inbox', { params: filters }).then((res) => res.data),
  sent: (filters: MessageFilters = {}) =>
    api.get('/messages/sent', { params: filters }).then((res) => res.data),
  adminInbox: (filters: MessageFilters = {}) =>
    api.get('/messages/admin/inbox', { params: filters }).then((res) => res.data),
  adminSummary: () => api.get('/messages/admin/summary').then((res) => res.data.data),
  unreadCount: () => api.get('/messages/unread-count').then((res) => res.data.data as { unreadCount: number }),
  getById: (id: string) => api.get(`/messages/${id}`).then((res) => res.data.data as MessageItem),
  create: (payload: Record<string, unknown>) => api.post('/messages', payload).then((res) => res.data),
  reply: (id: string, message: string) => api.post(`/messages/${id}/reply`, { message }).then((res) => res.data),
  markRead: (id: string) => api.patch(`/messages/${id}/read`).then((res) => res.data),
  close: (id: string) => api.patch(`/messages/${id}/close`).then((res) => res.data),
  publicContact: (payload: PublicContactPayload) => postPublicContact(payload),
  submitPublicContact
};
