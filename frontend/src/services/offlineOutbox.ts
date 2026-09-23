import axios from 'axios';
import { findReachableApiBase } from '@/utils/apiReachability';

export type PublicContactPayload = {
  name: string;
  email?: string;
  phone?: string;
  subject?: string;
  message: string;
};

export type QueuedPublicContact = OutboxItem;

type OutboxItem = {
  id: string;
  createdAt: number;
  payload: PublicContactPayload;
  retryCount: number;
};

const OUTBOX_KEY = 'nokta-outbox:public-contact:v1';
const MAX_QUEUE_ITEMS = 50;

function readOutbox(): OutboxItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as OutboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOutbox(items: OutboxItem[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(items.slice(-MAX_QUEUE_ITEMS)));
  } catch {
    // Quota or private-mode failures should not break the UI.
  }
}

function isNetworkFailure(error: unknown) {
  if (typeof error !== 'object' || !error) {
    return false;
  }

  const axiosError = error as { code?: string; message?: string; response?: { status?: number } };
  if (
    axiosError.code === 'ERR_NETWORK' ||
    axiosError.code === 'ECONNABORTED' ||
    axiosError.message === 'Network Error'
  ) {
    return true;
  }

  const status = axiosError.response?.status;
  return status === 0 || status === 502 || status === 503 || status === 504;
}

function isRetryableFailure(error: unknown) {
  if (isNetworkFailure(error)) {
    return true;
  }

  if (typeof error !== 'object' || !error) {
    return false;
  }

  const status = (error as { response?: { status?: number } }).response?.status;
  return status === 408 || status === 429;
}

function extractErrorMessage(error: unknown) {
  if (typeof error !== 'object' || !error) {
    return '';
  }

  const axiosError = error as {
    message?: string;
    response?: { data?: { message?: unknown } };
  };

  const serverMessage = axiosError.response?.data?.message;
  if (typeof serverMessage === 'string' && serverMessage.trim()) {
    return serverMessage.trim();
  }

  return typeof axiosError.message === 'string' ? axiosError.message.trim() : '';
}

export function queuePublicContact(payload: PublicContactPayload) {
  const item: OutboxItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: Date.now(),
    payload,
    retryCount: 0
  };

  writeOutbox([...readOutbox(), item]);
  return item.id;
}

export function getQueuedPublicContactCount() {
  return readOutbox().length;
}

export function getQueuedPublicContacts(): QueuedPublicContact[] {
  return readOutbox();
}

async function postPublicContactToBase(apiBase: string, payload: PublicContactPayload) {
  const response = await axios.post(`${apiBase}/messages/public-contact`, payload, {
    timeout: 20000,
    headers: { 'Content-Type': 'application/json' }
  });

  return response.data;
}

export async function postPublicContact(payload: PublicContactPayload) {
  const apiBase = await findReachableApiBase();
  if (!apiBase) {
    throw new Error('Local server is not reachable');
  }

  return postPublicContactToBase(apiBase, payload);
}

export async function submitPublicContact(payload: PublicContactPayload) {
  const apiBase = await findReachableApiBase(1200);

  if (apiBase) {
    try {
      const data = await postPublicContactToBase(apiBase, payload);
      return { status: 'sent' as const, data };
    } catch (error) {
      if (!isRetryableFailure(error)) {
        const message = extractErrorMessage(error);
        throw new Error(message || 'Unable to send message');
      }
    }
  }

  queuePublicContact(payload);
  return { status: 'queued' as const };
}

export async function flushPublicContactOutbox() {
  if (typeof window === 'undefined') {
    return { sent: 0, remaining: 0 };
  }

  const apiBase = await findReachableApiBase(1200);
  if (!apiBase) {
    return { sent: 0, remaining: readOutbox().length };
  }

  const items = readOutbox();
  if (!items.length) {
    return { sent: 0, remaining: 0 };
  }

  let sent = 0;
  const remaining: OutboxItem[] = [];

  for (const item of items) {
    try {
      await postPublicContactToBase(apiBase, item.payload);
      sent += 1;
    } catch (error) {
      if (isRetryableFailure(error)) {
        remaining.push({ ...item, retryCount: item.retryCount + 1 });
      }
    }
  }

  writeOutbox(remaining);
  return { sent, remaining: remaining.length };
}
