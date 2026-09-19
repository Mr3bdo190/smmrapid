import type { User } from 'firebase/auth';
import { apiJson } from '../lib/api';

/**
 * The admin API, as the panel calls it.
 *
 * Every call here is a request the server authorises on its own: the permission checks in the panel
 * decide what is *shown*, never what is *allowed*. A hidden button is a courtesy, not a control.
 */

type Envelope<T> = { success: true; data: T };

export type AdminServiceRow = {
  id: string;
  slug: string;
  name: string;
  nameAr: string | null;
  priceMinor: number;
  providerCostMinor: number | null;
  markupPercent: number | null;
  markupFixedMinor: number | null;
  minQuantity: number;
  maxQuantity: number;
  estimatedTime: string | null;
  priceUnit: string;
  inputType: string;
  isActive: boolean;
  isFeatured: boolean;
  deletedAt: string | null;
  provider: { id: string; name: string | null } | null;
  categoryName: string | null;
  marginPer1000Minor: number | null;
};

export type AdminServiceList = {
  services: AdminServiceRow[];
  total: number;
  page: number;
  pageSize: number;
  shop: { active: number; inactive: number; total: number };
};

export type AdminUserRow = {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  emailVerified: boolean;
  referralCode: string | null;
  createdAt: string;
  wallet: { balanceMinor: number; currency: string };
  orders: number;
  tickets: number;
};

export async function fetchAdminServices(
  user: User | null,
  params: { q?: string; active?: boolean; providerId?: string; page?: number; pageSize?: number } = {},
): Promise<AdminServiceList> {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.active !== undefined) search.set('active', String(params.active));
  if (params.providerId) search.set('providerId', params.providerId);
  if (params.page) search.set('page', String(params.page));
  if (params.pageSize) search.set('pageSize', String(params.pageSize));
  const suffix = search.toString();
  const { data } = await apiJson<Envelope<AdminServiceList>>(
    `/api/admin/services${suffix ? `?${suffix}` : ''}`,
    user,
  );
  return data;
}

export async function updateAdminService(
  user: User | null,
  id: string,
  patch: Partial<{
    name: string;
    nameAr: string | null;
    priceMinor: number;
    markupPercent: number | null;
    minQuantity: number;
    maxQuantity: number;
    estimatedTime: string | null;
    isActive: boolean;
    isFeatured: boolean;
    sortOrder: number;
  }>,
): Promise<AdminServiceRow> {
  const { data } = await apiJson<Envelope<{ service: AdminServiceRow }>>(
    `/api/admin/services/${encodeURIComponent(id)}`,
    user,
    { method: 'PATCH', body: JSON.stringify(patch) },
  );
  return data.service;
}

export async function bulkServices(
  user: User | null,
  action: 'activate' | 'deactivate' | 'feature' | 'unfeature',
  input: { ids?: string[]; all?: true; providerId?: string; expectCount?: number },
): Promise<{ action: string; changed: number }> {
  const { data } = await apiJson<Envelope<{ action: string; changed: number }>>(
    `/api/admin/services/bulk/${action}`,
    user,
    { method: 'POST', body: JSON.stringify(input) },
  );
  return data;
}

export async function deleteAdminService(user: User | null, id: string): Promise<{ deleted: boolean }> {
  const { data } = await apiJson<Envelope<{ deleted: boolean }>>(
    `/api/admin/services/${encodeURIComponent(id)}`,
    user,
    { method: 'DELETE' },
  );
  return data;
}

export async function fetchAdminUsers(
  user: User | null,
  params: { q?: string; status?: string; page?: number; pageSize?: number } = {},
): Promise<{ users: AdminUserRow[]; total: number; page: number; pageSize: number }> {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.status) search.set('status', params.status);
  if (params.page) search.set('page', String(params.page));
  if (params.pageSize) search.set('pageSize', String(params.pageSize));
  const suffix = search.toString();
  const { data } = await apiJson<Envelope<{ users: AdminUserRow[]; total: number; page: number; pageSize: number }>>(
    `/api/admin/users${suffix ? `?${suffix}` : ''}`,
    user,
  );
  return data;
}

export async function setUserStatus(
  user: User | null,
  id: string,
  action: 'suspend' | 'reactivate',
): Promise<{ changed: boolean }> {
  const { data } = await apiJson<Envelope<{ changed: boolean }>>(
    `/api/admin/users/${encodeURIComponent(id)}/${action}`,
    user,
    { method: 'POST' },
  );
  return data;
}

export async function fetchAdminUser(
  user: User | null,
  id: string,
): Promise<{
  user: AdminUserRow;
  roles: string[];
  auditTrail: { action: string; createdAt: string; actorUserId: string | null }[];
}> {
  const { data } = await apiJson<
    Envelope<{
      user: AdminUserRow;
      roles: string[];
      auditTrail: { action: string; createdAt: string; actorUserId: string | null }[];
    }>
  >(`/api/admin/users/${encodeURIComponent(id)}`, user);
  return data;
}

export async function setUserRoles(user: User | null, id: string, roles: string[]): Promise<{ roles: string[] }> {
  const { data } = await apiJson<Envelope<{ roles: string[] }>>(
    `/api/admin/users/${encodeURIComponent(id)}/roles`,
    user,
    { method: 'POST', body: JSON.stringify({ roles }) },
  );
  return data;
}
