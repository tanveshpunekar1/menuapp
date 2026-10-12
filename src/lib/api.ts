const API_BASE = '/api';

export interface ApiErrorEntry {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  code: string | number;
  message: string;
}

const ERROR_LOG_KEY = 'restoqr_debug_errors_v1';
const CLIENT_JOURNAL_KEY = 'restoqr_client_journal_v1';
const TOMBSTONES_KEY = 'restoqr_tombstones_v1';

interface ClientJournal {
  users: any[];
  restaurants: any[];
  subscriptions: any[];
  categories: any[];
  menu_items: any[];
  tables: any[];
  coupons: any[];
  orders: any[];
  order_items: any[];
  tombstones: string[];
}

function getEmptyJournal(): ClientJournal {
  return {
    users: [],
    restaurants: [],
    subscriptions: [],
    categories: [],
    menu_items: [],
    tables: [],
    coupons: [],
    orders: [],
    order_items: [],
    tombstones: [],
  };
}

export function getTombstones(): string[] {
  try {
    const raw = localStorage.getItem(TOMBSTONES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function addTombstone(id: string | string[]) {
  try {
    const ids = (Array.isArray(id) ? id : [id]).map(s => String(s).trim()).filter(Boolean);
    if (ids.length === 0) return;
    const current = new Set(getTombstones());
    ids.forEach(i => current.add(i));
    const next = Array.from(current).slice(-500);
    localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(next));

    // Also purge from client journal
    const journal = getClientJournal();
    const idSet = new Set(ids);
    journal.restaurants = (journal.restaurants || []).filter((r: any) => !idSet.has(String(r.id)));
    journal.users = (journal.users || []).filter((u: any) => !idSet.has(String(u.id)) && !idSet.has(String(u.restaurant_id)));
    journal.subscriptions = (journal.subscriptions || []).filter((s: any) => !idSet.has(String(s.id)) && !idSet.has(String(s.restaurant_id)));
    journal.categories = (journal.categories || []).filter((c: any) => !idSet.has(String(c.id)) && !idSet.has(String(c.restaurant_id)));
    journal.menu_items = (journal.menu_items || []).filter((m: any) => !idSet.has(String(m.id)) && !idSet.has(String(m.category_id)) && !idSet.has(String(m.restaurant_id)));
    journal.tables = (journal.tables || []).filter((t: any) => !idSet.has(String(t.id)) && !idSet.has(String(t.restaurant_id)));
    journal.coupons = (journal.coupons || []).filter((c: any) => !idSet.has(String(c.id)) && !idSet.has(String(c.restaurant_id)));
    journal.orders = (journal.orders || []).filter((o: any) => !idSet.has(String(o.id)) && !idSet.has(String(o.restaurant_id)));
    journal.tombstones = next;
    saveClientJournal(journal);
  } catch {
    // ignore storage errors
  }
}

export function getClientJournal(): ClientJournal {
  try {
    const raw = localStorage.getItem(CLIENT_JOURNAL_KEY);
    if (!raw) return { ...getEmptyJournal(), tombstones: getTombstones() };
    const parsed = JSON.parse(raw);
    return {
      ...getEmptyJournal(),
      ...parsed,
      tombstones: Array.from(new Set([...(parsed.tombstones || []), ...getTombstones()])),
    };
  } catch {
    return getEmptyJournal();
  }
}

export function saveClientJournal(journal: ClientJournal) {
  try {
    localStorage.setItem(CLIENT_JOURNAL_KEY, JSON.stringify(journal));
  } catch {
    // ignore quota errors
  }
}

export function upsertJournalRecord(collection: keyof Omit<ClientJournal, 'tombstones'>, record: any) {
  if (!record || !record.id) return;
  try {
    const journal = getClientJournal();
    const list = Array.isArray(journal[collection]) ? [...journal[collection]] : [];
    const idx = list.findIndex((item: any) => item.id === record.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...record };
    } else {
      list.push(record);
    }
    journal[collection] = list.slice(-200);
    saveClientJournal(journal);
  } catch {
    // ignore
  }
}

export function logApiError(endpoint: string, method: string, code: string | number, message: string) {
  try {
    const entry: ApiErrorEntry = {
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      code,
      message,
    };
    const existing = getErrorLogs();
    const updated = [entry, ...existing].slice(0, 20);
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('restoqr:api-error', { detail: entry }));
    }
  } catch {
    // ignore
  }
}

export function getErrorLogs(): ApiErrorEntry[] {
  try {
    const raw = localStorage.getItem(ERROR_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearErrorLogs() {
  try {
    localStorage.removeItem(ERROR_LOG_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('restoqr:api-error-clear'));
    }
  } catch {
    // ignore
  }
}

function filterOutTombstones<T extends { id?: string; category_id?: string; restaurant_id?: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return items;
  const tombstones = new Set(getTombstones());
  if (tombstones.size === 0) return items;
  return items.filter(item => {
    if (!item || typeof item !== 'object') return true;
    if (item.id && tombstones.has(String(item.id))) return false;
    if (item.category_id && tombstones.has(String(item.category_id))) return false;
    if (item.restaurant_id && tombstones.has(String(item.restaurant_id))) return false;
    return true;
  });
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('restoqr_token');
  const tombstones = getTombstones();
  const method = (options.method || 'GET').toUpperCase();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tombstones.length > 0 ? { 'X-RestoQR-Tombstones': tombstones.slice(-150).join(',') } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkErr: any) {
    const msg = networkErr?.message || 'Network connection error';
    logApiError(endpoint, method, 'NETWORK_ERROR', msg);
    throw new Error(msg);
  }

  let data: any;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => ({}));
  } else {
    const text = await response.text().catch(() => '');
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || `Request failed with status ${response.status}` };
    }
  }

  if (!response.ok) {
    const errorMessage = data?.error || data?.message || `Error ${response.status}: Request failed`;
    if (!(endpoint === '/auth/me' && response.status === 401 && !token)) {
      logApiError(endpoint, method, response.status, errorMessage);
    }
    const err = new Error(errorMessage) as Error & { status?: number; code?: string | number };
    err.status = response.status;
    err.code = data?.code || response.status;
    throw err;
  }

  return data as T;
}

export async function syncClientJournalToServer(): Promise<void> {
  try {
    const journal = getClientJournal();
    const hasData =
      journal.restaurants.length > 0 ||
      journal.users.length > 0 ||
      journal.menu_items.length > 0 ||
      journal.categories.length > 0 ||
      journal.tombstones.length > 0;
    if (!hasData) return;
    await request('/sync/client-journal', {
      method: 'POST',
      body: JSON.stringify(journal),
    });
  } catch {
    // Non-fatal background sync
  }
}

export const api = {
  // Auth
  login: async (credentials: any) => {
    const journal = getClientJournal();
    const email = (credentials?.email || '').trim();
    const password = credentials?.password ? String(credentials.password).trim() : '';
    const payload = {
      ...credentials,
      email,
      password,
      client_users: journal.users,
      client_restaurants: journal.restaurants,
      __journal: journal,
    };
    const res = await request<{ token: string; user: any; restaurant?: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res?.user) {
      upsertJournalRecord('users', {
        ...res.user,
        plain_password: password || undefined,
      });
    }
    if (res?.restaurant) {
      upsertJournalRecord('restaurants', res.restaurant);
    }
    return res;
  },
  getMe: () => request<{ user: any; restaurant?: any }>('/auth/me'),
  changePassword: (data: { current_password?: string; new_password: string }) =>
    request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Supabase Cloud Sync & Backup
  getSupabaseStatus: () => request<any>('/supabase/status'),
  getSupabaseSchema: () => request<{ sql: string }>('/supabase/schema'),
  syncSupabase: () => request<any>('/supabase/sync', { method: 'POST' }),
  restoreSupabase: () => request<any>('/supabase/restore', { method: 'POST' }),
  exportBackup: () => request<any>('/admin/backup/export'),
  importBackup: (backupData: any) =>
    request<any>('/admin/backup/import', {
      method: 'POST',
      body: JSON.stringify(backupData),
    }),

  // Super Admin
  getAdminMetrics: async () => {
    await syncClientJournalToServer();
    return request<any>('/admin/metrics');
  },
  getAdminRestaurants: async () => {
    await syncClientJournalToServer();
    const res = await request<any[]>('/admin/restaurants');
    const filtered = filterOutTombstones(res);
    const journal = getClientJournal();
    const tombstones = new Set(getTombstones());
    const map = new Map<string, any>();
    filtered.forEach(r => map.set(r.id, r));
    (journal.restaurants || []).forEach(r => {
      if (r?.id && !tombstones.has(String(r.id)) && !map.has(r.id)) {
        map.set(r.id, r);
      }
    });
    return Array.from(map.values());
  },
  getAdminUsers: async () => {
    await syncClientJournalToServer();
    const res = await request<any[]>('/admin/users');
    const filtered = filterOutTombstones(res);
    const journal = getClientJournal();
    const tombstones = new Set(getTombstones());
    const map = new Map<string, any>();
    filtered.forEach(u => map.set(u.id, u));
    (journal.users || []).forEach(u => {
      if (u?.id && !tombstones.has(String(u.id)) && !tombstones.has(String(u.restaurant_id)) && !map.has(u.id)) {
        map.set(u.id, u);
      }
    });
    return Array.from(map.values());
  },
  updateAdminUserPassword: (id: string, data: { new_password: string }) =>
    request<any>(`/admin/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  createAdminUser: async (data: { name: string; email: string; password: string; role: string; restaurant_id?: string }) => {
    const res = await request<any>('/admin/users', {
      method: 'POST',
      body: JSON.stringify({ ...data, __journal: getClientJournal() }),
    });
    if (res?.id) {
      upsertJournalRecord('users', {
        ...res,
        plain_password: data.password ? String(data.password).trim() : undefined,
      });
    }
    return res;
  },
  deleteAdminUser: async (id: string) => {
    addTombstone(id);
    return request<any>(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  },
  createRestaurant: async (data: any) => {
    const res = await request<any>('/admin/restaurants', {
      method: 'POST',
      body: JSON.stringify({ ...data, __journal: getClientJournal() }),
    });
    if (res?.id) {
      upsertJournalRecord('restaurants', res);
    }
    if (res?.owner?.id) {
      upsertJournalRecord('users', res.owner);
    }
    if (res?.subscription?.id) {
      upsertJournalRecord('subscriptions', res.subscription);
    }
    if (Array.isArray(res?.tables)) {
      res.tables.forEach((t: any) => upsertJournalRecord('tables', t));
    }
    return res;
  },
  updateRestaurantStatus: async (id: string, payload: string | Record<string, any>) => {
    const body = typeof payload === 'string' ? { status: payload } : payload;
    const res = await request<any>(`/admin/restaurants/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ ...body, __journal: getClientJournal() }),
    });
    if (res?.id) upsertJournalRecord('restaurants', res);
    return res;
  },
  updateRestaurantControl: async (id: string, payload: Record<string, any>) => {
    const res = await request<any>(`/admin/restaurants/${id}/control`, {
      method: 'PATCH',
      body: JSON.stringify({ ...payload, __journal: getClientJournal() }),
    });
    if (res?.restaurant?.id) upsertJournalRecord('restaurants', res.restaurant);
    else if (res?.id) upsertJournalRecord('restaurants', res);
    return res;
  },
  deleteRestaurant: async (id: string) => {
    addTombstone(id);
    const res = await request<any>(`/admin/restaurants/${id}`, {
      method: 'DELETE',
    });
    if (Array.isArray(res?.tombstones)) {
      addTombstone(res.tombstones);
    }
    return res;
  },
  getAdminSubscriptions: async () => {
    const res = await request<any[]>('/admin/subscriptions');
    return filterOutTombstones(res);
  },
  updateSubscription: (id: string, payload: Record<string, any>) =>
    request<any>(`/admin/subscriptions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getAdminLogs: () => request<any[]>('/admin/activity-logs'),

  // Restaurant Owner & Staff (with optional restaurantId override for Super Admin control)
  getRestaurantProfile: async (restaurantId?: string) => {
    const res = await request<any>(`/restaurant/profile${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`);
    if (res?.id) upsertJournalRecord('restaurants', res);
    return res;
  },
  updateRestaurantProfile: async (data: any, restaurantId?: string) => {
    const res = await request<any>(`/restaurant/profile${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, __journal: getClientJournal() }),
    });
    if (res?.id) upsertJournalRecord('restaurants', res);
    return res;
  },
  getMenu: async (restaurantId?: string) => {
    const res = await request<{ categories: any[]; items: any[] }>(
      `/restaurant/menu${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`
    );
    const tombstones = new Set(getTombstones());
    const journal = getClientJournal();
    const userStr = localStorage.getItem('restoqr_user');
    const currentRestId = restaurantId || (userStr ? (() => { try { return JSON.parse(userStr)?.restaurant_id; } catch { return undefined; } })() : undefined);

    const catMap = new Map<string, any>();
    filterOutTombstones(res.categories || []).forEach(c => catMap.set(c.id, c));
    (journal.categories || []).forEach(c => {
      if (
        c?.id &&
        (!currentRestId || c.restaurant_id === currentRestId) &&
        !tombstones.has(String(c.id)) &&
        !catMap.has(c.id)
      ) {
        catMap.set(c.id, c);
      }
    });

    const itemMap = new Map<string, any>();
    filterOutTombstones(res.items || []).forEach(i => itemMap.set(i.id, i));
    (journal.menu_items || []).forEach(i => {
      if (
        i?.id &&
        (!currentRestId || i.restaurant_id === currentRestId) &&
        !tombstones.has(String(i.id)) &&
        !tombstones.has(String(i.category_id)) &&
        !itemMap.has(i.id)
      ) {
        itemMap.set(i.id, i);
      }
    });

    return {
      categories: Array.from(catMap.values()),
      items: Array.from(itemMap.values()),
    };
  },
  createCategory: async (data: any, restaurantId?: string) => {
    const res = await request<any>(`/restaurant/categories${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'POST',
      body: JSON.stringify({ ...data, __journal: getClientJournal() }),
    });
    if (res?.id) upsertJournalRecord('categories', res);
    return res;
  },
  updateCategory: async (id: string, data: any, restaurantId?: string) => {
    const res = await request<any>(`/restaurant/categories/${id}${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, __journal: getClientJournal() }),
    });
    if (res?.id) upsertJournalRecord('categories', res);
    return res;
  },
  deleteCategory: async (id: string, restaurantId?: string) => {
    addTombstone(id);
    const res = await request<any>(`/restaurant/categories/${id}${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'DELETE',
    });
    if (Array.isArray(res?.tombstones)) addTombstone(res.tombstones);
    return res;
  },
  createMenuItem: async (data: any, restaurantId?: string) => {
    const res = await request<any>(`/restaurant/items${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'POST',
      body: JSON.stringify({ ...data, __journal: getClientJournal() }),
    });
    if (res?.id) upsertJournalRecord('menu_items', res);
    return res;
  },
  updateMenuItem: async (id: string, data: any, restaurantId?: string) => {
    const res = await request<any>(`/restaurant/items/${id}${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, __journal: getClientJournal() }),
    });
    if (res?.id) upsertJournalRecord('menu_items', res);
    return res;
  },
  deleteMenuItem: async (id: string, restaurantId?: string) => {
    addTombstone(id);
    const res = await request<any>(`/restaurant/items/${id}${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'DELETE',
    });
    if (Array.isArray(res?.tombstones)) addTombstone(res.tombstones);
    return res;
  },
  duplicateMenuItem: async (id: string, restaurantId?: string) => {
    const res = await request<any>(`/restaurant/items/${id}/duplicate${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'POST',
      body: JSON.stringify({ __journal: getClientJournal() }),
    });
    if (res?.id) upsertJournalRecord('menu_items', res);
    return res;
  },
  getTables: async (restaurantId?: string) => {
    const res = await request<any[]>(`/restaurant/tables${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`);
    return filterOutTombstones(res);
  },
  createTable: async (data: any, restaurantId?: string) => {
    const res = await request<any>(`/restaurant/tables${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'POST',
      body: JSON.stringify({ ...data, __journal: getClientJournal() }),
    });
    if (res?.id) upsertJournalRecord('tables', res);
    return res;
  },
  updateTable: (id: string, data: any, restaurantId?: string) =>
    request<any>(`/restaurant/tables/${id}${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTable: async (id: string, restaurantId?: string) => {
    addTombstone(id);
    return request<any>(`/restaurant/tables/${id}${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'DELETE',
    });
  },
  getCoupons: async (restaurantId?: string) => {
    const res = await request<any[]>(`/restaurant/coupons${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`);
    return filterOutTombstones(res);
  },
  createCoupon: async (data: any, restaurantId?: string) => {
    const res = await request<any>(`/restaurant/coupons${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'POST',
      body: JSON.stringify({ ...data, __journal: getClientJournal() }),
    });
    if (res?.id) upsertJournalRecord('coupons', res);
    return res;
  },
  updateCoupon: (id: string, data: any, restaurantId?: string) =>
    request<any>(`/restaurant/coupons/${id}${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCoupon: async (id: string, restaurantId?: string) => {
    addTombstone(id);
    return request<any>(`/restaurant/coupons/${id}${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'DELETE',
    });
  },
  getOrders: async (restaurantId?: string) => {
    const res = await request<any[]>(`/restaurant/orders${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`);
    return filterOutTombstones(res);
  },
  updateOrderStatus: (id: string, order_status: string, restaurantId?: string) =>
    request<any>(`/restaurant/orders/${id}/status${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'PATCH',
      body: JSON.stringify({ order_status }),
    }),
  editOrderItems: (
    id: string,
    items: { menu_item_id: string; quantity: number; notes?: string }[],
    notes?: string,
    restaurantId?: string
  ) =>
    request<any>(`/restaurant/orders/${id}/items${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'PUT',
      body: JSON.stringify({ items, notes }),
    }),
  updatePaymentStatus: (id: string, payment_status: string, payment_method?: string, restaurantId?: string) =>
    request<any>(`/restaurant/orders/${id}/payment${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_status, ...(payment_method ? { payment_method } : {}) }),
    }),
  updateOrderPayment: (id: string, payment_status: string, payment_method?: string, restaurantId?: string) =>
    request<any>(`/restaurant/orders/${id}/payment${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_status, ...(payment_method ? { payment_method } : {}) }),
    }),
  markOrderPaid: (id: string, restaurantId?: string) =>
    request<any>(`/restaurant/orders/${id}/payment${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_status: 'paid' }),
    }),
  completeOrderWithCash: (id: string, restaurantId?: string) =>
    request<any>(`/restaurant/orders/${id}/complete-cash${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'POST',
    }),
  deleteOrder: async (id: string, restaurantId?: string) => {
    addTombstone(id);
    return request<any>(`/restaurant/orders/${id}${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'DELETE',
    });
  },
  dailyClearOrders: (restaurantId?: string) =>
    request<any>(`/restaurant/orders/daily-clear${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'POST',
    }),
  getArchivedOrderHistory: (date?: string, restaurantId?: string) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (restaurantId) params.set('restaurant_id', restaurantId);
    const qs = params.toString();
    return request<{ dates: string[]; records: any[] }>(`/restaurant/orders/history${qs ? `?${qs}` : ''}`);
  },
  getCustomers: (restaurantId?: string) =>
    request<any[]>(`/restaurant/customers${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`),
  getStaff: async (restaurantId?: string) => {
    const res = await request<any[]>(`/restaurant/staff${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`);
    return filterOutTombstones(res);
  },
  addStaff: async (data: any, restaurantId?: string) => {
    const res = await request<any>(`/restaurant/staff${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'POST',
      body: JSON.stringify({ ...data, __journal: getClientJournal() }),
    });
    if (res?.id) {
      upsertJournalRecord('users', {
        ...res,
        plain_password: data?.password ? String(data.password).trim() : undefined,
      });
    }
    return res;
  },
  updateStaffPassword: (id: string, new_password: string, restaurantId?: string) =>
    request<any>(`/restaurant/staff/${id}/password${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'PATCH',
      body: JSON.stringify({ new_password }),
    }),
  deleteStaff: async (id: string, restaurantId?: string) => {
    addTombstone(id);
    return request<any>(`/restaurant/staff/${id}${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'DELETE',
    });
  },
  getServiceRequests: (restaurantId?: string) =>
    request<any[]>(`/restaurant/service-requests${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`),
  updateServiceRequest: (id: string, status: string, restaurantId?: string) =>
    request<any>(`/restaurant/service-requests/${id}${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  clearResolvedServiceRequests: (restaurantId?: string) =>
    request<any>(`/restaurant/service-requests/clear-resolved${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'POST',
    }),
  settleTableBill: (tableNum: number | string, payment_method?: string, restaurantId?: string) =>
    request<any>(
      `/restaurant/tables/${tableNum}/settle-bill${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`,
      {
        method: 'POST',
        body: JSON.stringify({ payment_method }),
      }
    ),
  waiterPunchOrder: async (data: Record<string, any>, restaurantId?: string) => {
    const res = await request<any>(`/restaurant/orders/punch${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'POST',
      body: JSON.stringify({ ...data, __journal: getClientJournal() }),
    });
    if (res?.order?.id) upsertJournalRecord('orders', res.order);
    return res;
  },
  getAnalytics: (restaurantId?: string) =>
    request<any>(`/restaurant/analytics${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`),
  getTableRunningBill: (tableId: string, restaurantId?: string) =>
    request<any>(`/restaurant/tables/${tableId}/running-bill${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`),
  settleTable: (tableId: string, restaurantId?: string) =>
    request<any>(`/restaurant/tables/${tableId}/settle${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'POST',
    }),
  verifyOrderCode: (orderId: string, code: string) =>
    request<any>(`/restaurant/orders/${orderId}/verify-code`, {
      method: 'PATCH',
      body: JSON.stringify({ code }),
    }),
  updateRestaurantOperations: (data: Record<string, any>, restaurantId?: string) =>
    request<any>(`/restaurant/settings/operations${restaurantId ? `?restaurant_id=${restaurantId}` : ''}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Public Customer QR Menu
  getPublicMenu: async (slug: string) => {
    await syncClientJournalToServer();
    const res = await request<any>(`/public/menu/${slug}`);
    if (res?.items) res.items = filterOutTombstones(res.items);
    if (res?.categories) res.categories = filterOutTombstones(res.categories);
    return res;
  },
  getPublicTableMenu: async (slug: string, tableNum: string | number) => {
    await syncClientJournalToServer();
    const res = await request<any>(`/public/menu/${slug}/table/${tableNum}`);
    if (res?.items) res.items = filterOutTombstones(res.items);
    if (res?.categories) res.categories = filterOutTombstones(res.categories);
    return res;
  },
  getPublicTableOrders: (slug: string, tableNum: string | number) =>
    request<any>(`/public/table/${slug}/${tableNum}/orders`),
  getRecentOrders: (data: Record<string, any>) =>
    request<any>('/public/orders/recent', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  customerPhoneLogin: (data: { name: string; phone: string; restaurant_id?: string }) =>
    request<any>('/public/customer/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getCustomerPastOrders: (phone: string, restaurant_id?: string) =>
    request<any>(
      `/public/customer/orders?phone=${encodeURIComponent(phone)}${restaurant_id ? `&restaurant_id=${restaurant_id}` : ''}`
    ),
  callWaiter: (data: Record<string, any>) =>
    request<any>('/public/table/service-request', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getTableServiceRequest: (restaurantId: string, tableNumber: number | string) =>
    request<any>(`/public/table/service-request/${restaurantId}/${tableNumber}`),
  payTableBillOnline: (data: Record<string, any>) =>
    request<any>('/public/table/pay-bill', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  validateCoupon: (restaurant_id: string, code: string, subtotal: number) =>
    request<any>('/public/coupon/validate', {
      method: 'POST',
      body: JSON.stringify({ restaurant_id, code, subtotal }),
    }),
  placeOrder: (data: any) =>
    request<any>('/public/order', {
      method: 'POST',
      body: JSON.stringify({ ...data, __journal: getClientJournal() }),
    }),
  verifyOnlinePayment: (orderId: string, status: 'paid' | 'failed', extra?: Record<string, any>) =>
    request<any>(`/public/order/${orderId}/verify-payment`, {
      method: 'POST',
      body: JSON.stringify({ status, ...extra }),
    }),
  verifyPayment: (orderId: string, status: 'paid' | 'failed', extra?: Record<string, any>) =>
    request<any>(`/public/order/${orderId}/verify-payment`, {
      method: 'POST',
      body: JSON.stringify({ status, ...extra }),
    }),
};
