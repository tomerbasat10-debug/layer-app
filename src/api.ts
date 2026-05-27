import { Capacitor } from '@capacitor/core';

const EMAIL_KEY = 'layer_user_email';
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (Capacitor.isNativePlatform() ? 'https://layer-app.onrender.com' : '');

export const setStoredEmail = (email: string) => {
  localStorage.setItem(EMAIL_KEY, email);
};

export const clearStoredEmail = () => {
  localStorage.removeItem(EMAIL_KEY);
};

export const getStoredEmail = (): string => {
  return localStorage.getItem(EMAIL_KEY) || '';
};

export const apiFetch = (url: string, options: RequestInit = {}): Promise<Response> => {
  const email = getStoredEmail();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {})
  };
  if (email) headers['x-user-email'] = email;
  if (!(options.headers as any)?.['Content-Type'] && options.body) {
    headers['Content-Type'] = 'application/json';
  }
  const requestUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  return fetch(requestUrl, { ...options, headers });
};
