import { API_BASE_URL } from '@/constants/api';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Extracts a human-readable message from a FastAPI error body (401 `detail` string, 422 `HTTPValidationError`). */
function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((entry) => (entry && typeof entry === 'object' && 'msg' in entry ? String(entry.msg) : null))
        .filter(Boolean)
        .join(' ') || fallback;
    }
  }
  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiError(response.status, extractErrorMessage(body, `Request failed (${response.status})`));
  }

  return body as T;
}

export type UserRole = 'admin' | 'user';

export type MerchantCreate = {
  full_name: string;
  business_name: string;
  email: string;
  password: string;
  phone_number?: string | null;
};

export type MerchantRead = {
  id: string;
  full_name: string;
  business_name: string;
  email: string;
  role: UserRole;
  phone_number?: string | null;
};

export type CustomerRead = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  address?: string | null;
  phone_number?: string | null;
};

export type Token = {
  access_token: string;
  token_type: string;
};

export type CurrentUserResponse =
  | { type: 'merchant'; user: MerchantRead }
  | { type: 'customer'; user: CustomerRead };

export function signupMerchant(data: MerchantCreate): Promise<MerchantRead> {
  return request<MerchantRead>('/merchant/create_merchant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function loginMerchant(email: string, password: string): Promise<Token> {
  const form = new URLSearchParams();
  form.set('grant_type', 'password');
  form.set('username', email);
  form.set('password', password);

  return request<Token>('/auth/login/merchant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
}

export function getMe(accessToken: string): Promise<CurrentUserResponse> {
  return request<CurrentUserResponse>('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
