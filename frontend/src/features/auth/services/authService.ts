import { api } from '@/services/apiClient';

export type CaptchaChallengePayload = {
  challengeId: string;
  svg: string;
  expiresInSeconds: number;
};

export const authService = {
  getCaptcha: (theme: 'light' | 'dark' = 'dark') =>
    api.get('/auth/captcha', { params: { theme } }).then((res) => (res.data?.data ?? res.data) as CaptchaChallengePayload),
  login: (payload: {
    email: string;
    password: string;
    captchaChallengeId: string;
    captchaAnswer: string;
    role?: string;
  }) => api.post('/auth/login', payload),
  verifyLoginTwoFactor: (payload: { email: string; code: string }) => api.post('/auth/login/2fa', payload),
  registerStudent: (payload: Record<string, unknown>) =>
    api.post('/auth/register/student', payload).then((res) => res.data),
  registerQuote: (payload: { classId: string; subjectId: string; teacherId: string }) =>
    api.post('/auth/register/quote', payload).then((res) => res.data),
  registerCheckout: (payload: { email: string; classId: string; subjectId: string; teacherId: string }) =>
    api.post('/auth/register/checkout', payload).then((res) => res.data),
  registerPaymentConfig: () => api.get('/auth/register/payment-config').then((res) => res.data?.data ?? res.data),
  confirmRegistrationPayment: (payload: {
    email: string;
    classId: string;
    subjectId: string;
    teacherId: string;
    checkoutToken: string;
    paymentReference: string;
    paymentMethod?: string;
  }) => api.post('/auth/register/confirm-payment', payload).then((res) => res.data?.data ?? res.data),
  getRegistrationOptions: (params?: { classId?: string; subjectId?: string }) =>
    api.get('/auth/register/options', { params }).then((res) => res.data),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }).then((res) => res.data),
  profile: () => api.get('/auth/profile').then((res) => res.data),
  updateProfile: (payload: { name?: string; email?: string; phone?: string; profileImage?: string }) =>
    api.put('/auth/profile', payload).then((res) => res.data),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/profile/change-password', payload).then((res) => res.data),
  uploadProfileImage: (file: File) => {
    const body = new FormData();
    body.append('profileImage', file);
    return api.post('/uploads/profile-image', body, { headers: { 'Content-Type': 'multipart/form-data' } }).then((res) => res.data);
  },
  logout: (refreshToken?: string | null) => api.post('/auth/logout', { refreshToken }).then((res) => res.data)
};
